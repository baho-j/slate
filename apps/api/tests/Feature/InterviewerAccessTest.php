<?php

use App\Actions\EnsureDefaultPipeline;
use App\Enums\InterviewStatus;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\Candidate;
use App\Models\Interview;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);

    $this->interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();
    $this->job = Job::factory()->for($this->acme)->published()->create();

    $this->assigned = Application::factory()->for($this->job)->for(Candidate::factory())->create();
    $this->unassigned = Application::factory()->for($this->job)->for(Candidate::factory())->create();

    Interview::factory()->for($this->assigned)->create(['interviewer_id' => $this->interviewer->id]);
});

test('an interviewer can read an application they are assigned to interview', function () {
    $this->actingAs($this->interviewer)
        ->getJson("/api/applications/{$this->assigned->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $this->assigned->id);
});

test('an interviewer cannot read an application they are not assigned to', function () {
    $this->actingAs($this->interviewer)
        ->getJson("/api/applications/{$this->unassigned->id}")
        ->assertForbidden();
});

test('an interviewer assigned to one application cannot read another in the same job', function () {
    $this->actingAs($this->interviewer)
        ->getJson("/api/applications/{$this->assigned->id}")
        ->assertOk();

    $this->actingAs($this->interviewer)
        ->getJson("/api/applications/{$this->unassigned->id}")
        ->assertForbidden();
});

test('a cancelled interview still grants access to the application', function () {
    $cancelled = Application::factory()->for($this->job)->for(Candidate::factory())->create();
    Interview::factory()->for($cancelled)->status(InterviewStatus::Cancelled)->create([
        'interviewer_id' => $this->interviewer->id,
    ]);

    $this->actingAs($this->interviewer)
        ->getJson("/api/applications/{$cancelled->id}")
        ->assertOk();
});

test('an interviewer from another org gets 404, not 403', function () {
    $outsider = User::factory()->for($this->globex)->role(UserRole::Interviewer)->create();

    $this->actingAs($outsider)
        ->getJson("/api/applications/{$this->assigned->id}")
        ->assertNotFound();
});

test('reassigning the interview revokes the previous interviewer access', function () {
    $replacement = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();
    $recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();

    $interview = Interview::withoutGlobalScopes()
        ->where('application_id', $this->assigned->id)
        ->firstOrFail();

    $this->actingAs($recruiter)
        ->patchJson("/api/interviews/{$interview->id}", ['interviewer_id' => $replacement->id])
        ->assertOk();

    $this->actingAs($this->interviewer)
        ->getJson("/api/applications/{$this->assigned->id}")
        ->assertForbidden();

    $this->actingAs($replacement)
        ->getJson("/api/applications/{$this->assigned->id}")
        ->assertOk();
});

test('an interviewer still cannot list a job applications', function () {
    $this->actingAs($this->interviewer)
        ->getJson("/api/jobs/{$this->job->id}/applications")
        ->assertForbidden();
});

test('an interviewer cannot move an application stage', function () {
    $stage = app(EnsureDefaultPipeline::class)->forJob($this->job)->stages()->first();

    $this->actingAs($this->interviewer)
        ->patchJson("/api/applications/{$this->assigned->id}/stage", ['stage_id' => $stage->id])
        ->assertForbidden();
});

function attachCv(Application $application): ApplicationDocument
{
    return $application->documents()->create([
        'kind' => 'cv',
        'blob_path' => 'cv/'.Str::uuid().'.pdf',
        'original_name' => 'cv.pdf',
        'mime' => 'application/pdf',
        'size_bytes' => 1024,
    ]);
}

test('an interviewer can download the cv of an application they interview', function () {
    $document = attachCv($this->assigned);

    $this->actingAs($this->interviewer)
        ->getJson("/api/applications/{$this->assigned->id}/documents/{$document->id}/url")
        ->assertOk()
        ->assertJsonStructure(['url']);
});

test('an interviewer cannot download the cv of an application they do not interview', function () {
    $document = attachCv($this->unassigned);

    $this->actingAs($this->interviewer)
        ->getJson("/api/applications/{$this->unassigned->id}/documents/{$document->id}/url")
        ->assertForbidden();
});
