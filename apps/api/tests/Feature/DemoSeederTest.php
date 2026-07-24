<?php

use App\Enums\UserRole;
use App\Models\Organization;
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

test('seeding is idempotent', function () {
    $before = User::count();

    $this->seed(DemoSeeder::class);

    expect(User::count())->toBe($before);
});
