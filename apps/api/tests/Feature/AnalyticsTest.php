<?php

use App\Actions\EnsureDefaultPipeline;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);

    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
    $this->job = Job::factory()->for($this->acme)->published()->create();
    $this->stages = app(EnsureDefaultPipeline::class)->forJob($this->job)->stages()->orderBy('order')->get();
});

function placeApplication(Job $job, int $stageId): Application
{
    return Application::factory()
        ->for($job)
        ->for(Candidate::factory())
        ->create(['current_stage_id' => $stageId]);
}

describe('overview', function () {
    test('a recruiter sees headline counts scoped to their org', function () {
        placeApplication($this->job, $this->stages[0]->id);
        placeApplication($this->job, $this->stages[1]->id);

        // Another org's data must not leak in.
        $globexJob = Job::factory()->for($this->globex)->published()->create();
        placeApplication($globexJob, app(EnsureDefaultPipeline::class)->forJob($globexJob)->stages()->first()->id);

        $this->actingAs($this->recruiter)
            ->getJson('/api/analytics/overview')
            ->assertOk()
            ->assertJsonPath('data.open_jobs', 1)
            ->assertJsonPath('data.applications', 2)
            ->assertJsonPath('data.interviews_scheduled', 0);
    });

    test('applications are counted within the period window', function () {
        placeApplication($this->job, $this->stages[0]->id);
        $old = placeApplication($this->job, $this->stages[0]->id);
        $old->forceFill(['created_at' => now()->subDays(90)])->saveQuietly();

        $this->actingAs($this->recruiter)
            ->getJson('/api/analytics/overview?days=30')
            ->assertOk()
            ->assertJsonPath('data.applications', 1);
    });

    test('an interviewer cannot see analytics', function () {
        $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

        $this->actingAs($interviewer)
            ->getJson('/api/analytics/overview')
            ->assertForbidden();
    });

    test('analytics requires authentication', function () {
        $this->getJson('/api/analytics/overview')->assertUnauthorized();
    });
});

describe('funnel', function () {
    test('it counts applications per stage in order with conversion rates', function () {
        // 4 in the first stage, 2 in the second, 1 in the third.
        collect(range(1, 4))->each(fn () => placeApplication($this->job, $this->stages[0]->id));
        collect(range(1, 2))->each(fn () => placeApplication($this->job, $this->stages[1]->id));
        placeApplication($this->job, $this->stages[2]->id);

        $response = $this->actingAs($this->recruiter)
            ->getJson("/api/analytics/jobs/{$this->job->id}")
            ->assertOk();

        $funnel = collect($response->json('data.funnel'));

        expect($funnel->firstWhere('stage_id', $this->stages[0]->id)['count'])->toBe(4)
            ->and($funnel->firstWhere('stage_id', $this->stages[1]->id)['count'])->toBe(2)
            ->and($funnel->firstWhere('stage_id', $this->stages[1]->id)['conversion_rate'])->toBe(0.5)
            ->and($funnel->firstWhere('stage_id', $this->stages[0]->id)['conversion_rate'])->toBeNull();
    });

    test('a stage with no upstream applications does not divide by zero', function () {
        // Nothing in stage 1, one application straight in stage 2.
        placeApplication($this->job, $this->stages[1]->id);

        $response = $this->actingAs($this->recruiter)
            ->getJson("/api/analytics/jobs/{$this->job->id}")
            ->assertOk();

        $second = collect($response->json('data.funnel'))->firstWhere('stage_id', $this->stages[1]->id);

        expect($second['count'])->toBe(1)
            ->and($second['conversion_rate'])->toBeNull();
    });

    test('a job with no applications returns zeroed stages, not an error', function () {
        $response = $this->actingAs($this->recruiter)
            ->getJson("/api/analytics/jobs/{$this->job->id}")
            ->assertOk();

        expect(collect($response->json('data.funnel'))->pluck('count')->unique()->all())->toBe([0]);
    });

    test('another org gets 404 for a job funnel', function () {
        $outsider = User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

        $this->actingAs($outsider)
            ->getJson("/api/analytics/jobs/{$this->job->id}")
            ->assertNotFound();
    });
});

describe('time in stage', function () {
    test('it averages the hours between stage transitions', function () {
        $application = placeApplication($this->job, $this->stages[0]->id);

        // Entered stage 1 at T-0, moved to stage 2 six hours later.
        DB::table('application_status_history')->insert([
            [
                'application_id' => $application->id,
                'to_stage_id' => $this->stages[0]->id,
                'to_status' => 'applied',
                'created_at' => now()->subHours(6),
            ],
            [
                'application_id' => $application->id,
                'to_stage_id' => $this->stages[1]->id,
                'to_status' => 'applied',
                'created_at' => now(),
            ],
        ]);

        $response = $this->actingAs($this->recruiter)
            ->getJson("/api/analytics/jobs/{$this->job->id}")
            ->assertOk();

        $first = collect($response->json('data.time_in_stage'))->firstWhere('stage_id', $this->stages[0]->id);

        expect($first['samples'])->toBe(1)
            ->and(round($first['avg_hours']))->toBe(6.0);
    });

    test('a stage never left reports null hours with zero samples', function () {
        $response = $this->actingAs($this->recruiter)
            ->getJson("/api/analytics/jobs/{$this->job->id}")
            ->assertOk();

        $first = collect($response->json('data.time_in_stage'))->first();

        expect($first['samples'])->toBe(0)
            ->and($first['avg_hours'])->toBeNull()
            ->and($first['median_hours'])->toBeNull();
    });
});

describe('query cost', function () {
    test('the job analytics is a fixed number of queries regardless of volume', function () {
        collect(range(1, 3))->each(fn () => placeApplication($this->job, $this->stages[0]->id));

        $this->actingAs($this->recruiter);
        $url = "/api/analytics/jobs/{$this->job->id}";
        $this->getJson($url)->assertOk();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson($url)->assertOk();
        $forThree = count(DB::getQueryLog());
        DB::disableQueryLog();

        collect(range(1, 30))->each(fn () => placeApplication($this->job, $this->stages[0]->id));

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson($url)->assertOk();
        $forThirtyThree = count(DB::getQueryLog());
        DB::disableQueryLog();

        expect($forThirtyThree)->toBe($forThree);
    });
});
