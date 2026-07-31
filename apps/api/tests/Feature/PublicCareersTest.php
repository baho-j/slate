<?php

use App\Enums\JobStatus;
use App\Models\Job;
use App\Models\Organization;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);
});

test('org profile is public and exposes no internal fields', function () {
    $this->getJson('/api/public/o/acme')
        ->assertOk()
        ->assertJsonPath('data.slug', 'acme')
        ->assertJsonPath('data.name', $this->acme->name)
        ->assertJsonStructure(['data' => ['name', 'slug', 'description', 'website']])
        ->assertJsonMissingPath('data.id')
        ->assertJsonMissingPath('data.logo_path');
});

test('an unknown org slug returns 404', function () {
    $this->getJson('/api/public/o/nope')->assertNotFound();
});

test('the jobs list returns only published jobs for the org', function () {
    Job::factory()->for($this->acme)->published()->count(2)->create();
    Job::factory()->for($this->acme)->create(['status' => JobStatus::Draft]);
    Job::factory()->for($this->acme)->status(JobStatus::Closed)->create();
    Job::factory()->for($this->acme)->status(JobStatus::Archived)->create();

    $this->getJson('/api/public/o/acme/jobs')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure(['data', 'links', 'meta']);
});

test('the jobs list is isolated per org by slug', function () {
    Job::factory()->for($this->acme)->published()->create();
    Job::factory()->for($this->globex)->published()->count(3)->create();

    $this->getJson('/api/public/o/acme/jobs')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('the jobs list full-text search matches on title', function () {
    $match = Job::factory()->for($this->acme)->published()->create([
        'title' => 'Kubernetes Platform Engineer',
    ]);
    Job::factory()->for($this->acme)->published()->create(['title' => 'Office Manager']);

    $this->getJson('/api/public/o/acme/jobs?q=kubernetes')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $match->id);
});

test('the jobs list requires no authentication', function () {
    Job::factory()->for($this->acme)->published()->create();

    $this->getJson('/api/public/o/acme/jobs')->assertOk();
});

test('a published job is viewable and hides internal fields', function () {
    $job = Job::factory()->for($this->acme)->published()->create();

    $this->getJson("/api/public/o/acme/jobs/{$job->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $job->id)
        ->assertJsonMissingPath('data.status')
        ->assertJsonMissingPath('data.created_by');
});

test('a draft job 404s on a direct public link', function () {
    $job = Job::factory()->for($this->acme)->create(['status' => JobStatus::Draft]);

    $this->getJson("/api/public/o/acme/jobs/{$job->id}")->assertNotFound();
});

test('a closed job 404s on a direct public link', function () {
    $job = Job::factory()->for($this->acme)->status(JobStatus::Closed)->create();

    $this->getJson("/api/public/o/acme/jobs/{$job->id}")->assertNotFound();
});

test('an archived job 404s on a direct public link', function () {
    $job = Job::factory()->for($this->acme)->status(JobStatus::Archived)->create();

    $this->getJson("/api/public/o/acme/jobs/{$job->id}")->assertNotFound();
});

test('a published job from another org 404s under this org slug', function () {
    $job = Job::factory()->for($this->globex)->published()->create();

    $this->getJson("/api/public/o/acme/jobs/{$job->id}")->assertNotFound();
});
