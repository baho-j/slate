<?php

use App\Enums\EmploymentType;
use App\Enums\JobStatus;
use App\Enums\UserRole;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    $this->acme = Organization::factory()->create();
    $this->globex = Organization::factory()->create();
    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
});

function validJobPayload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Backend Engineer',
        'description' => 'Build and own the API.',
        'department' => 'Engineering',
        'location' => 'Remote',
        'employment_type' => EmploymentType::FullTime->value,
        'salary_min' => 80000,
        'salary_max' => 120000,
        'currency' => 'USD',
    ], $overrides);
}

test('index lists only the acting org jobs, paginated', function () {
    Job::factory()->for($this->acme)->count(3)->create();
    Job::factory()->for($this->globex)->create();

    $this->actingAs($this->recruiter)
        ->getJson('/api/jobs')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure(['data', 'links', 'meta']);
});

test('index requires authentication', function () {
    $this->getJson('/api/jobs')->assertUnauthorized();
});

test('index filters by status', function () {
    Job::factory()->for($this->acme)->published()->create();
    Job::factory()->for($this->acme)->create();

    $this->actingAs($this->recruiter)
        ->getJson('/api/jobs?status=published')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'published');
});

test('index full-text search matches on title and description', function () {
    $match = Job::factory()->for($this->acme)->create([
        'title' => 'Kubernetes Platform Engineer',
        'description' => 'Own container orchestration.',
    ]);
    Job::factory()->for($this->acme)->create(['title' => 'Office Manager']);

    $this->actingAs($this->recruiter)
        ->getJson('/api/jobs?q=kubernetes')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $match->id);
});

test('index rejects an out-of-range per_page', function () {
    $this->actingAs($this->recruiter)
        ->getJson('/api/jobs?per_page=500')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['per_page']);
});

test('a candidate without an org cannot list jobs', function () {
    $this->actingAs(User::factory()->candidate()->create())
        ->getJson('/api/jobs')
        ->assertForbidden();
});

test('a recruiter can create a job', function () {
    $this->actingAs($this->recruiter)
        ->postJson('/api/jobs', validJobPayload())
        ->assertCreated()
        ->assertJsonPath('data.title', 'Backend Engineer')
        ->assertJsonPath('data.status', JobStatus::Draft->value);

    $this->assertDatabaseHas('jobs', [
        'title' => 'Backend Engineer',
        'organization_id' => $this->acme->id,
        'created_by' => $this->recruiter->id,
        'status' => JobStatus::Draft->value,
    ]);
});

test('create validates required fields with the standard 422 shape', function () {
    $this->actingAs($this->recruiter)
        ->postJson('/api/jobs', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title', 'description', 'employment_type'])
        ->assertJsonStructure(['message', 'errors']);
});

test('create rejects unknown fields', function () {
    $this->actingAs($this->recruiter)
        ->postJson('/api/jobs', validJobPayload(['organization_id' => $this->globex->id, 'foo' => 'bar']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['organization_id', 'foo']);
});

test('create rejects salary_max below salary_min', function () {
    $this->actingAs($this->recruiter)
        ->postJson('/api/jobs', validJobPayload(['salary_min' => 90000, 'salary_max' => 50000]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['salary_max']);
});

test('an interviewer cannot create a job', function () {
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

    $this->actingAs($interviewer)
        ->postJson('/api/jobs', validJobPayload())
        ->assertForbidden();
});

test('a recruiter can view a job in their org', function () {
    $job = Job::factory()->for($this->acme)->create();

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$job->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $job->id);
});

test('an interviewer cannot view a job — jobs are a recruiter+ surface', function () {
    $job = Job::factory()->for($this->acme)->create();
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

    $this->actingAs($interviewer)
        ->getJson("/api/jobs/{$job->id}")
        ->assertForbidden();
});

test('viewing a job from another org returns 404, not 403', function () {
    $job = Job::factory()->for($this->globex)->create();

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$job->id}")
        ->assertNotFound();
});

test('a recruiter can update a job', function () {
    $job = Job::factory()->for($this->acme)->create(['title' => 'Old title']);

    $this->actingAs($this->recruiter)
        ->patchJson("/api/jobs/{$job->id}", ['title' => 'New title'])
        ->assertOk()
        ->assertJsonPath('data.title', 'New title');

    expect($job->refresh()->title)->toBe('New title');
});

test('update rejects unknown fields', function () {
    $job = Job::factory()->for($this->acme)->create();

    $this->actingAs($this->recruiter)
        ->patchJson("/api/jobs/{$job->id}", ['status' => 'published'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);
});

test('updating a job from another org returns 404', function () {
    $job = Job::factory()->for($this->globex)->create();

    $this->actingAs($this->recruiter)
        ->patchJson("/api/jobs/{$job->id}", ['title' => 'Hijacked'])
        ->assertNotFound();
});

test('a recruiter can delete a job', function () {
    $job = Job::factory()->for($this->acme)->create();

    $this->actingAs($this->recruiter)
        ->deleteJson("/api/jobs/{$job->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('jobs', ['id' => $job->id]);
});

test('an interviewer cannot delete a job', function () {
    $job = Job::factory()->for($this->acme)->create();
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

    $this->actingAs($interviewer)
        ->deleteJson("/api/jobs/{$job->id}")
        ->assertForbidden();
});

test('publish transitions a draft job to published', function () {
    $job = Job::factory()->for($this->acme)->create(['status' => JobStatus::Draft]);

    $this->actingAs($this->recruiter)
        ->postJson("/api/jobs/{$job->id}/publish")
        ->assertOk()
        ->assertJsonPath('data.status', JobStatus::Published->value);

    expect($job->refresh()->status)->toBe(JobStatus::Published);
});

test('close transitions a job to closed', function () {
    $job = Job::factory()->for($this->acme)->published()->create();

    $this->actingAs($this->recruiter)
        ->postJson("/api/jobs/{$job->id}/close")
        ->assertOk()
        ->assertJsonPath('data.status', JobStatus::Closed->value);
});

test('an interviewer cannot publish a job', function () {
    $job = Job::factory()->for($this->acme)->create();
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

    $this->actingAs($interviewer)
        ->postJson("/api/jobs/{$job->id}/publish")
        ->assertForbidden();
});

test('a super admin can manage jobs across orgs', function () {
    $job = Job::factory()->for($this->globex)->create();

    $this->actingAs(User::factory()->superAdmin()->create())
        ->patchJson("/api/jobs/{$job->id}", ['title' => 'Admin edit'])
        ->assertOk()
        ->assertJsonPath('data.title', 'Admin edit');
});
