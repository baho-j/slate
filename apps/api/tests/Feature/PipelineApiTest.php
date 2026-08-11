<?php

use App\Actions\EnsureDefaultPipeline;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    $this->acme = Organization::factory()->create();
    $this->globex = Organization::factory()->create();
    $this->hr = User::factory()->for($this->acme)->role(UserRole::HrManager)->create();
    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
    $this->job = Job::factory()->for($this->acme)->create();

    $this->pipeline = app(EnsureDefaultPipeline::class)->forJob($this->job);
    $this->stages = $this->pipeline->stages()->orderBy('order')->get();
});

function stagePayload(array $stages, ?string $name = null): array
{
    $payload = ['stages' => $stages];

    return $name === null ? $payload : $payload + ['name' => $name];
}

function stageInput(string $name, ?int $id = null, bool $isTerminal = false): array
{
    return ['id' => $id, 'name' => $name, 'is_terminal' => $isTerminal];
}

test('get returns the job pipeline with ordered stages', function () {
    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/pipeline")
        ->assertOk()
        ->assertJsonPath('data.stages.0.name', 'Applied')
        ->assertJsonPath('data.stages.0.order', 1)
        ->assertJsonPath('data.stages.5.name', 'Rejected')
        ->assertJsonPath('data.stages.5.is_terminal', true)
        ->assertJsonCount(6, 'data.stages');
});

test('get creates a default pipeline for a job that has none', function () {
    $fresh = Job::factory()->for($this->acme)->create();

    expect($fresh->pipeline()->exists())->toBeFalse();

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$fresh->id}/pipeline")
        ->assertOk()
        ->assertJsonCount(6, 'data.stages');

    expect($fresh->fresh()->pipeline()->exists())->toBeTrue();
});

test('each job gets its own independent pipeline', function () {
    $other = Job::factory()->for($this->acme)->create();
    $otherPipeline = app(EnsureDefaultPipeline::class)->forJob($other);

    expect($otherPipeline->id)->not->toBe($this->pipeline->id);
    expect($otherPipeline->stages()->pluck('id')->intersect($this->stages->pluck('id')))->toBeEmpty();
});

test('put reorders stages and renumbers the order column', function () {
    $reversed = $this->stages->reverse()->values()
        ->map(fn ($stage) => stageInput($stage->name, $stage->id, $stage->is_terminal))
        ->all();

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($reversed))
        ->assertOk()
        ->assertJsonPath('data.stages.0.name', 'Rejected')
        ->assertJsonPath('data.stages.0.order', 1)
        ->assertJsonPath('data.stages.5.name', 'Applied')
        ->assertJsonPath('data.stages.5.order', 6);
});

test('reordering keeps stage ids so applications stay where they are', function () {
    $applied = $this->stages->firstWhere('name', 'Applied');
    $application = Application::factory()
        ->for($this->job)
        ->for(Candidate::factory())
        ->create(['current_stage_id' => $applied->id]);

    $reversed = $this->stages->reverse()->values()
        ->map(fn ($stage) => stageInput($stage->name, $stage->id, $stage->is_terminal))
        ->all();

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($reversed))
        ->assertOk();

    expect($application->fresh()->current_stage_id)->toBe($applied->id);
});

test('put adds a new stage and renames an existing one', function () {
    $stages = $this->stages->map(fn ($stage) => stageInput(
        $stage->name === 'Offer' ? 'Offer Extended' : $stage->name,
        $stage->id,
        $stage->is_terminal,
    ))->all();

    $stages[] = stageInput('Screening Call');

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($stages))
        ->assertOk()
        ->assertJsonCount(7, 'data.stages')
        ->assertJsonPath('data.stages.3.name', 'Offer Extended')
        ->assertJsonPath('data.stages.6.name', 'Screening Call');

    $this->assertDatabaseHas('pipeline_stages', [
        'pipeline_id' => $this->pipeline->id,
        'name' => 'Screening Call',
        'order' => 7,
    ]);
});

test('put deletes stages left out of the payload', function () {
    $kept = $this->stages->take(3)
        ->map(fn ($stage) => stageInput($stage->name, $stage->id, $stage->is_terminal))
        ->all();

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($kept))
        ->assertOk()
        ->assertJsonCount(3, 'data.stages');

    $this->assertDatabaseMissing('pipeline_stages', [
        'pipeline_id' => $this->pipeline->id,
        'name' => 'Rejected',
    ]);
});

test('deleting a stage that holds applications returns 409', function () {
    $offer = $this->stages->firstWhere('name', 'Offer');
    Application::factory()
        ->for($this->job)
        ->for(Candidate::factory())
        ->create(['current_stage_id' => $offer->id]);

    $without = $this->stages->reject(fn ($stage) => $stage->id === $offer->id)->values()
        ->map(fn ($stage) => stageInput($stage->name, $stage->id, $stage->is_terminal))
        ->all();

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($without))
        ->assertStatus(409)
        ->assertJsonPath('message', fn (string $message) => str_contains($message, 'Offer'));

    $this->assertDatabaseHas('pipeline_stages', ['id' => $offer->id]);
});

test('the 409 leaves the whole pipeline untouched', function () {
    $offer = $this->stages->firstWhere('name', 'Offer');
    Application::factory()
        ->for($this->job)
        ->for(Candidate::factory())
        ->create(['current_stage_id' => $offer->id]);

    $renamedAndTrimmed = $this->stages
        ->reject(fn ($stage) => $stage->id === $offer->id)
        ->values()
        ->map(fn ($stage) => stageInput('Renamed '.$stage->name, $stage->id, $stage->is_terminal))
        ->all();

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($renamedAndTrimmed))
        ->assertStatus(409);

    expect($this->pipeline->stages()->pluck('name')->all())
        ->toBe($this->stages->pluck('name')->all());
});

test('a stage emptied of applications can then be deleted', function () {
    $offer = $this->stages->firstWhere('name', 'Offer');
    $interview = $this->stages->firstWhere('name', 'Interview');

    $application = Application::factory()
        ->for($this->job)
        ->for(Candidate::factory())
        ->create(['current_stage_id' => $offer->id]);

    $without = $this->stages->reject(fn ($stage) => $stage->id === $offer->id)->values()
        ->map(fn ($stage) => stageInput($stage->name, $stage->id, $stage->is_terminal))
        ->all();

    $application->update(['current_stage_id' => $interview->id]);

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($without))
        ->assertOk()
        ->assertJsonCount(5, 'data.stages');
});

test('the response reports how many applications sit in each stage', function () {
    $applied = $this->stages->firstWhere('name', 'Applied');
    Application::factory()
        ->for($this->job)
        ->count(2)
        ->sequence(fn () => ['candidate_id' => Candidate::factory()])
        ->create(['current_stage_id' => $applied->id]);

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/pipeline")
        ->assertOk()
        ->assertJsonPath('data.stages.0.application_count', 2)
        ->assertJsonPath('data.stages.1.application_count', 0);
});

test('put renames the pipeline when a name is given', function () {
    $stages = $this->stages->map(fn ($stage) => stageInput($stage->name, $stage->id, $stage->is_terminal))->all();

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($stages, 'Engineering Loop'))
        ->assertOk()
        ->assertJsonPath('data.name', 'Engineering Loop');
});

test('a recruiter cannot configure stages', function () {
    $stages = $this->stages->map(fn ($stage) => stageInput($stage->name, $stage->id, $stage->is_terminal))->all();

    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($stages))
        ->assertForbidden();
});

test('an interviewer cannot configure stages', function () {
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();
    $stages = $this->stages->map(fn ($stage) => stageInput($stage->name, $stage->id, $stage->is_terminal))->all();

    $this->actingAs($interviewer)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload($stages))
        ->assertForbidden();
});

test('reading a pipeline requires authentication', function () {
    $this->getJson("/api/jobs/{$this->job->id}/pipeline")->assertUnauthorized();
});

test('a job in another org returns 404', function () {
    $foreign = Job::factory()->for($this->globex)->create();

    $this->actingAs($this->hr)
        ->getJson("/api/jobs/{$foreign->id}/pipeline")
        ->assertNotFound();

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$foreign->id}/pipeline", stagePayload([stageInput('Applied')]))
        ->assertNotFound();
});

test('an hr manager cannot borrow a stage id from another job', function () {
    $other = Job::factory()->for($this->acme)->create();
    $foreignStage = app(EnsureDefaultPipeline::class)->forJob($other)->stages()->first();

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload([
            stageInput('Applied', $foreignStage->id),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['stages.0.id']);
});

test('a pipeline cannot be emptied', function () {
    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload([]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['stages']);
});

test('stage names must be unique within the pipeline', function () {
    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload([
            stageInput('Applied'),
            stageInput('Applied'),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['stages.0.name']);
});

test('a pipeline needs at least one non-terminal stage', function () {
    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload([
            stageInput('Hired', null, true),
            stageInput('Rejected', null, true),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['stages']);
});

test('a stage name is required', function () {
    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload([
            ['id' => null, 'is_terminal' => false],
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['stages.0.name']);
});

test('replacing every stage with new ones swaps the whole set', function () {
    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload([
            stageInput('Triage'),
            stageInput('Onsite'),
            stageInput('Closed', null, true),
        ]))
        ->assertOk()
        ->assertJsonCount(3, 'data.stages')
        ->assertJsonPath('data.stages.0.name', 'Triage');

    expect($this->pipeline->stages()->pluck('name')->all())->toBe(['Triage', 'Onsite', 'Closed']);
});

test('a full swap is blocked when any old stage holds applications', function () {
    Application::factory()
        ->for($this->job)
        ->for(Candidate::factory())
        ->create(['current_stage_id' => $this->stages->first()->id]);

    $this->actingAs($this->hr)
        ->putJson("/api/jobs/{$this->job->id}/pipeline", stagePayload([stageInput('Triage')]))
        ->assertStatus(409);

    expect($this->pipeline->stages()->count())->toBe(6);
});
