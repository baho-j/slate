<?php

use App\Enums\JobStatus;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('cv');
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);
    $this->job = Job::factory()->for($this->acme)->published()->create();
});

function storeCv(string $key = 'cv/valid.pdf'): string
{
    Storage::disk('cv')->put($key, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

    return $key;
}

function applyPayload(array $overrides = []): array
{
    return array_merge([
        'full_name' => 'Cora Candidate',
        'email' => 'cora@example.com',
        'cover_note' => 'I would love to join.',
        'cv_key' => storeCv(),
        'cv_original_name' => 'cora-cv.pdf',
    ], $overrides);
}

test('a candidate can apply and the full chain persists', function () {
    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", applyPayload())
        ->assertCreated()
        ->assertJsonPath('message', 'Your application has been submitted.');

    $candidate = Candidate::where('email', 'cora@example.com')->firstOrFail();
    $application = Application::withoutGlobalScopes()->where('candidate_id', $candidate->id)->firstOrFail();

    expect($application->job_id)->toBe($this->job->id)
        ->and($application->organization_id)->toBe($this->acme->id)
        ->and($application->status->value)->toBe('applied')
        ->and($application->current_stage_id)->not->toBeNull();

    $this->assertDatabaseHas('application_documents', [
        'application_id' => $application->id,
        'blob_path' => 'cv/valid.pdf',
        'mime' => 'application/pdf',
        'original_name' => 'cora-cv.pdf',
    ]);

    $this->assertDatabaseHas('application_status_history', [
        'application_id' => $application->id,
        'to_status' => 'applied',
    ]);
});

test('applying reuses an existing candidate by email', function () {
    $existing = Candidate::factory()->create(['email' => 'cora@example.com']);
    $otherJob = Job::factory()->for($this->acme)->published()->create();

    $this->postJson("/api/public/o/acme/jobs/{$otherJob->id}/apply", applyPayload(['cv_key' => storeCv('cv/a.pdf')]))
        ->assertCreated();

    expect(Candidate::where('email', 'cora@example.com')->count())->toBe(1);
    expect(Application::withoutGlobalScopes()->where('candidate_id', $existing->id)->count())->toBe(1);
});

test('a duplicate application to the same job returns 409', function () {
    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", applyPayload(['cv_key' => storeCv('cv/a.pdf')]))
        ->assertCreated();

    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", applyPayload(['cv_key' => storeCv('cv/b.pdf')]))
        ->assertStatus(409);

    expect(Application::withoutGlobalScopes()->count())->toBe(1);
});

test('apply validates required fields with the standard 422 shape', function () {
    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['full_name', 'email', 'cv_key', 'cv_original_name'])
        ->assertJsonStructure(['message', 'errors']);
});

test('apply rejects a forged CV content type', function () {
    Storage::disk('cv')->put('cv/evil.pdf', "#!/bin/sh\necho pwned\n");

    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", applyPayload(['cv_key' => 'cv/evil.pdf']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['cv_key']);

    expect(Application::withoutGlobalScopes()->count())->toBe(0);
});

test('apply requires no authentication', function () {
    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", applyPayload())
        ->assertCreated();
});

test('applying to a draft job returns 404', function () {
    $draft = Job::factory()->for($this->acme)->create(['status' => JobStatus::Draft]);

    $this->postJson("/api/public/o/acme/jobs/{$draft->id}/apply", applyPayload())
        ->assertNotFound();
});

test('applying to a job under the wrong org slug returns 404', function () {
    $this->postJson("/api/public/o/globex/jobs/{$this->job->id}/apply", applyPayload())
        ->assertNotFound();
});

test('a failed CV verification persists nothing', function () {
    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", applyPayload(['cv_key' => 'cv/missing.pdf']))
        ->assertUnprocessable();

    expect(Candidate::count())->toBe(0)
        ->and(Application::withoutGlobalScopes()->count())->toBe(0);
});
