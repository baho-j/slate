<?php

use App\Enums\EmploymentType;
use App\Enums\JobStatus;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['name' => 'Acme']);
    $this->globex = Organization::factory()->create(['name' => 'Globex']);
});

test('creating a job assigns the acting user organization and creator', function () {
    $user = User::factory()->for($this->acme)->create();
    $this->actingAs($user);

    $job = Job::create([
        'title' => 'Backend Engineer',
        'description' => 'Build the API.',
        'employment_type' => EmploymentType::FullTime,
    ]);

    expect($job->organization_id)->toBe($this->acme->id)
        ->and($job->created_by)->toBe($user->id);
});

test('the org scope hides jobs from other organizations', function () {
    $this->actingAs(User::factory()->for($this->acme)->create());

    Job::factory()->for($this->acme)->create(['title' => 'acme role']);
    $globexJob = Job::factory()->for($this->globex)->create(['title' => 'globex role']);

    expect(Job::pluck('title'))->toContain('acme role')->not->toContain('globex role')
        ->and(Job::find($globexJob->id))->toBeNull();
});

test('a super admin sees jobs across organizations', function () {
    Job::factory()->for($this->acme)->create();
    Job::factory()->for($this->globex)->create();

    $this->actingAs(User::factory()->superAdmin()->create());

    expect(Job::count())->toBe(2);
});

test('status and employment_type are cast to enums', function () {
    $job = Job::factory()->for($this->acme)->published()->create([
        'employment_type' => EmploymentType::Contract,
    ]);

    expect($job->refresh()->status)->toBe(JobStatus::Published)
        ->and($job->employment_type)->toBe(EmploymentType::Contract);
});

test('the generated search vector matches on title and description', function () {
    $this->actingAs(User::factory()->for($this->acme)->create());

    $match = Job::factory()->for($this->acme)->create([
        'title' => 'Kubernetes Platform Engineer',
        'description' => 'Own our container orchestration.',
    ]);
    Job::factory()->for($this->acme)->create([
        'title' => 'Office Manager',
        'description' => 'Keep the lights on.',
    ]);

    $found = Job::whereRaw("search_vector @@ plainto_tsquery('english', ?)", ['kubernetes'])->pluck('id');

    expect($found)->toContain($match->id)->toHaveCount(1);
});

test('the creator relationship resolves the owning user', function () {
    $user = User::factory()->for($this->acme)->create();
    $this->actingAs($user);

    $job = Job::factory()->for($this->acme)->create(['created_by' => $user->id]);

    expect($job->creator->is($user))->toBeTrue();
});
