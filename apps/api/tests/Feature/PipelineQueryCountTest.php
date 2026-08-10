<?php

use App\Actions\EnsureDefaultPipeline;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use App\Models\Pipeline;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function countQueries(callable $callback): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();

    $callback();

    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

function pipelineWithStages(Job $job, int $extraStages): Pipeline
{
    $pipeline = app(EnsureDefaultPipeline::class)->forJob($job);

    for ($i = 1; $i <= $extraStages; $i++) {
        $pipeline->stages()->create(['name' => "Extra {$i}", 'order' => 100 + $i, 'is_terminal' => false]);
    }

    return $pipeline;
}

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->hr = User::factory()->for($this->organization)->role(UserRole::HrManager)->create();
});

test('reading a pipeline costs the same whatever the stage count', function () {
    $small = Job::factory()->for($this->organization)->create();
    $large = Job::factory()->for($this->organization)->create();

    pipelineWithStages($small, 0);
    pipelineWithStages($large, 20);

    $this->actingAs($this->hr);
    $this->getJson("/api/jobs/{$small->id}/pipeline")->assertOk();

    $forSmall = countQueries(fn () => $this->getJson("/api/jobs/{$small->id}/pipeline")->assertOk());
    $forLarge = countQueries(fn () => $this->getJson("/api/jobs/{$large->id}/pipeline")->assertOk());

    expect($forLarge)->toBe($forSmall);
});

test('the application counts do not add a query per stage', function () {
    $job = Job::factory()->for($this->organization)->create();
    $stages = pipelineWithStages($job, 10)->stages()->get();

    foreach ($stages as $stage) {
        Application::factory()
            ->for($job)
            ->for(Candidate::factory())
            ->create(['current_stage_id' => $stage->id]);
    }

    $this->actingAs($this->hr);
    $this->getJson("/api/jobs/{$job->id}/pipeline")->assertOk();

    $queries = countQueries(fn () => $this->getJson("/api/jobs/{$job->id}/pipeline")
        ->assertOk()
        ->assertJsonPath('data.stages.0.application_count', 1));

    expect($queries)->toBeLessThan($stages->count());
});
