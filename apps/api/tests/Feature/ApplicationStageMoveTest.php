<?php

use App\Actions\EnsureDefaultPipeline;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);
    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
    $this->job = Job::factory()->for($this->acme)->published()->create();

    $pipeline = app(EnsureDefaultPipeline::class)->forJob($this->job);
    $this->stages = $pipeline->stages()->orderBy('order')->get();
    $this->firstStage = $this->stages->first();
    $this->nextStage = $this->stages->get(1);
});

function applicationOn(Job $job, ?int $stageId): Application
{
    return Application::factory()
        ->for($job)
        ->for(Candidate::factory())
        ->create(['current_stage_id' => $stageId]);
}

test('a recruiter can move an application to a new stage and it logs history', function () {
    $application = applicationOn($this->job, $this->firstStage->id);

    $this->actingAs($this->recruiter)
        ->patchJson("/api/applications/{$application->id}/stage", [
            'stage_id' => $this->nextStage->id,
            'note' => 'Strong CV, advancing.',
        ])
        ->assertOk()
        ->assertJsonPath('data.current_stage.id', $this->nextStage->id)
        ->assertJsonPath('data.status_history.0.to_stage', $this->nextStage->name);

    expect($application->fresh()->current_stage_id)->toBe($this->nextStage->id);

    $this->assertDatabaseHas('application_status_history', [
        'application_id' => $application->id,
        'from_stage_id' => $this->firstStage->id,
        'to_stage_id' => $this->nextStage->id,
        'changed_by' => $this->recruiter->id,
        'note' => 'Strong CV, advancing.',
    ]);
});

test('moving a stage requires authentication', function () {
    $application = applicationOn($this->job, $this->firstStage->id);

    $this->patchJson("/api/applications/{$application->id}/stage", ['stage_id' => $this->nextStage->id])
        ->assertUnauthorized();
});

test('an interviewer cannot move a stage', function () {
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();
    $application = applicationOn($this->job, $this->firstStage->id);

    $this->actingAs($interviewer)
        ->patchJson("/api/applications/{$application->id}/stage", ['stage_id' => $this->nextStage->id])
        ->assertForbidden();
});

test('moving an application from another org returns 404', function () {
    $otherJob = Job::factory()->for($this->globex)->create();
    $application = applicationOn($otherJob, null);

    $this->actingAs($this->recruiter)
        ->patchJson("/api/applications/{$application->id}/stage", ['stage_id' => $this->nextStage->id])
        ->assertNotFound();
});

test('the target stage must belong to this job pipeline', function () {
    $otherJob = Job::factory()->for($this->acme)->published()->create();
    $foreignStage = app(EnsureDefaultPipeline::class)->forJob($otherJob)->stages()->first();
    $application = applicationOn($this->job, $this->firstStage->id);

    $this->actingAs($this->recruiter)
        ->patchJson("/api/applications/{$application->id}/stage", ['stage_id' => $foreignStage->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['stage_id']);
});

test('stage_id is required', function () {
    $application = applicationOn($this->job, $this->firstStage->id);

    $this->actingAs($this->recruiter)
        ->patchJson("/api/applications/{$application->id}/stage", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['stage_id']);
});

test('the detail response exposes the pipeline stages for the picker', function () {
    $application = applicationOn($this->job, $this->firstStage->id);

    $this->actingAs($this->recruiter)
        ->getJson("/api/applications/{$application->id}")
        ->assertOk()
        ->assertJsonCount($this->stages->count(), 'data.available_stages')
        ->assertJsonPath('data.available_stages.0.name', $this->firstStage->name);
});
