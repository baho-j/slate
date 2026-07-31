<?php

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
});

function makeApplication(Job $job, array $candidate = [], array $overrides = []): Application
{
    return Application::factory()
        ->for($job)
        ->for(Candidate::factory()->state($candidate))
        ->create($overrides);
}

test('a recruiter can list a job applications, paginated', function () {
    makeApplication($this->job);
    makeApplication($this->job);
    makeApplication(Job::factory()->for($this->globex)->create());

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/applications")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure(['data' => [['id', 'status', 'candidate' => ['full_name', 'email']]], 'links', 'meta']);
});

test('listing applications requires authentication', function () {
    $this->getJson("/api/jobs/{$this->job->id}/applications")->assertUnauthorized();
});

test('an interviewer cannot list applications', function () {
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

    $this->actingAs($interviewer)
        ->getJson("/api/jobs/{$this->job->id}/applications")
        ->assertForbidden();
});

test('a recruiter from another org gets 404 for the job', function () {
    $otherRecruiter = User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

    $this->actingAs($otherRecruiter)
        ->getJson("/api/jobs/{$this->job->id}/applications")
        ->assertNotFound();
});

test('the list filters by candidate name', function () {
    $match = makeApplication($this->job, ['full_name' => 'Grace Hopper']);
    makeApplication($this->job, ['full_name' => 'Alan Turing']);

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/applications?q=grace")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $match->id);
});

test('the list filters by status', function () {
    makeApplication($this->job, [], ['status' => 'in_review']);
    makeApplication($this->job, [], ['status' => 'applied']);

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/applications?status=in_review")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'in_review');
});

test('a recruiter can view an application detail with candidate, documents and history', function () {
    $application = makeApplication($this->job, ['full_name' => 'Grace Hopper', 'phone' => '+123']);
    $application->documents()->create([
        'kind' => 'cv',
        'blob_path' => 'cv/x.pdf',
        'original_name' => 'grace.pdf',
        'mime' => 'application/pdf',
        'size_bytes' => 1234,
    ]);
    $application->statusHistory()->create(['to_status' => 'applied', 'note' => 'Submitted.']);

    $this->actingAs($this->recruiter)
        ->getJson("/api/applications/{$application->id}")
        ->assertOk()
        ->assertJsonPath('data.candidate.full_name', 'Grace Hopper')
        ->assertJsonPath('data.candidate.phone', '+123')
        ->assertJsonCount(1, 'data.documents')
        ->assertJsonPath('data.documents.0.original_name', 'grace.pdf')
        ->assertJsonCount(1, 'data.status_history')
        ->assertJsonPath('data.status_history.0.to_status', 'applied');
});

test('viewing an application from another org returns 404', function () {
    $application = makeApplication(Job::factory()->for($this->globex)->create());

    $this->actingAs($this->recruiter)
        ->getJson("/api/applications/{$application->id}")
        ->assertNotFound();
});

test('a candidate can view only their own application', function () {
    $candidateUser = User::factory()->candidate()->create();
    $mine = makeApplication($this->job, ['user_id' => $candidateUser->id]);
    $theirs = makeApplication($this->job);

    $this->actingAs($candidateUser)
        ->getJson("/api/applications/{$mine->id}")
        ->assertOk();

    $this->actingAs($candidateUser)
        ->getJson("/api/applications/{$theirs->id}")
        ->assertForbidden();
});

test('a recruiter can get a CV download url', function () {
    $application = makeApplication($this->job);
    $document = $application->documents()->create([
        'kind' => 'cv',
        'blob_path' => 'cv/x.pdf',
        'original_name' => 'grace.pdf',
        'mime' => 'application/pdf',
        'size_bytes' => 1234,
    ]);

    $this->actingAs($this->recruiter)
        ->getJson("/api/applications/{$application->id}/documents/{$document->id}/url")
        ->assertOk()
        ->assertJsonStructure(['url']);
});

test('a document url for a mismatched application returns 404', function () {
    $application = makeApplication($this->job);
    $other = makeApplication($this->job);
    $otherDoc = $other->documents()->create([
        'kind' => 'cv',
        'blob_path' => 'cv/y.pdf',
        'original_name' => 'other.pdf',
        'mime' => 'application/pdf',
        'size_bytes' => 10,
    ]);

    $this->actingAs($this->recruiter)
        ->getJson("/api/applications/{$application->id}/documents/{$otherDoc->id}/url")
        ->assertNotFound();
});

test('listing applications does not N+1 on candidates and stages', function () {
    makeApplication($this->job);
    makeApplication($this->job);
    makeApplication($this->job);

    DB::enableQueryLog();
    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/applications")
        ->assertOk();
    $queries = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($queries)->toBeLessThan(10);
});
