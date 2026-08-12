<?php

use App\Enums\UserRole;
use App\Models\Interview;
use App\Models\Job;
use App\Models\Organization;
use App\Models\ScreeningCriterion;
use App\Models\User;
use Database\Seeders\DemoSeeder;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
});

test('it seeds two organizations', function () {
    expect(Organization::whereIn('slug', ['acme', 'globex'])->count())->toBe(2);
});

test('it seeds one user per role with the documented credentials', function (string $email, UserRole $role, bool $hasOrg) {
    $user = User::where('email', $email)->first();

    expect($user)->not->toBeNull()
        ->and($user->role)->toBe($role)
        ->and($user->organization_id === null)->toBe(! $hasOrg);
})->with([
    'super admin' => ['admin@slate.test', UserRole::SuperAdmin, false],
    'hr manager' => ['hr@slate.test', UserRole::HrManager, true],
    'recruiter' => ['recruiter@slate.test', UserRole::Recruiter, true],
    'interviewer' => ['interviewer@slate.test', UserRole::Interviewer, true],
    'candidate' => ['candidate@slate.test', UserRole::Candidate, false],
]);

test('staff are distributed across both organizations', function () {
    $acme = Organization::where('slug', 'acme')->first();
    $globex = Organization::where('slug', 'globex')->first();

    expect(User::where('organization_id', $acme->id)->count())->toBeGreaterThan(0)
        ->and(User::where('organization_id', $globex->id)->count())->toBeGreaterThan(0);
});

test('every demo account can log in with the shared password', function (string $email) {
    $this->withHeader('Origin', 'http://localhost')
        ->postJson('/api/auth/login', ['email' => $email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.email', $email);
})->with([
    'admin@slate.test',
    'hr@slate.test',
    'recruiter@slate.test',
    'interviewer@slate.test',
    'candidate@slate.test',
]);

test('it seeds two jobs carrying populated typed fields', function () {
    $admin = User::where('email', 'admin@slate.test')->first();
    $this->actingAs($admin);

    $jobs = Job::has('applicationFields')->get();

    expect($jobs)->toHaveCount(2);

    $fields = $jobs->first()->applicationFields;

    expect($fields->pluck('key')->all())
        ->toBe(['years_experience', 'has_work_permit', 'skills', 'degree']);
});

test('it seeds screening criteria on the jobs that have fields', function () {
    $admin = User::where('email', 'admin@slate.test')->first();
    $this->actingAs($admin);

    $job = Job::has('screeningCriteria')->first();

    expect($job)->not->toBeNull()
        ->and($job->screeningCriteria->pluck('field_key')->all())
        ->toBe(['years_experience', 'has_work_permit', 'skills', 'degree']);
});

test('seeding is idempotent', function () {
    $before = User::count();
    $beforeJobs = Job::withoutGlobalScopes()->count();
    $beforeCriteria = ScreeningCriterion::count();

    $this->seed(DemoSeeder::class);

    expect(User::count())->toBe($before)
        ->and(Job::withoutGlobalScopes()->count())->toBe($beforeJobs)
        ->and(ScreeningCriterion::count())->toBe($beforeCriteria);
});

test('it seeds applications spread across the open stages of a job', function () {
    $admin = User::where('email', 'admin@slate.test')->first();
    $this->actingAs($admin);

    $job = Job::has('applications')->first();

    expect($job)->not->toBeNull();

    $byStage = $job->applications()->get()->groupBy('current_stage_id');

    expect($byStage->count())->toBeGreaterThan(1);
    expect($job->applications()->count())->toBeGreaterThanOrEqual(10);
});

test('seeded applications carry answers and a real screening verdict', function () {
    $admin = User::where('email', 'admin@slate.test')->first();
    $this->actingAs($admin);

    $application = Job::has('applications')->first()->applications()->first();

    expect($application->answers()->count())->toBe(4)
        ->and($application->statusHistory()->count())->toBe(1);

    $verdicts = Job::has('applications')->first()->applications()->pluck('eligibility')->unique();

    expect($verdicts->count())->toBeGreaterThan(1);
});

test('seeded candidates are distinct people', function () {
    $admin = User::where('email', 'admin@slate.test')->first();
    $this->actingAs($admin);

    $applications = Job::has('applications')->first()->applications()->with('candidate')->get();
    $names = $applications->pluck('candidate.full_name');

    expect($names->unique()->count())->toBe($names->count());
});

test('the demo interviewer has interviews to open', function () {
    $admin = User::where('email', 'admin@slate.test')->first();
    $this->actingAs($admin);

    $ivan = User::where('email', 'interviewer@slate.test')->firstOrFail();
    $interviews = Interview::where('interviewer_id', $ivan->id)->get();

    expect($interviews)->toHaveCount(3)
        ->and($interviews->every(fn ($interview) => $interview->scheduled_at->isFuture()))->toBeTrue()
        ->and($interviews->pluck('organization_id')->unique()->all())->toBe([$ivan->organization_id]);
});

test('seeding twice does not duplicate interviews', function () {
    $this->seed(DemoSeeder::class);

    $admin = User::where('email', 'admin@slate.test')->first();
    $this->actingAs($admin);

    $ivan = User::where('email', 'interviewer@slate.test')->firstOrFail();

    expect(Interview::where('interviewer_id', $ivan->id)->count())->toBe(3);
});
