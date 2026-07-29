<?php

use App\Enums\UserRole;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    $this->acme = Organization::factory()->create();
    $this->globex = Organization::factory()->create();
    $this->job = Job::factory()->for($this->acme)->create();
});

dataset('managing roles', [
    'hr_manager' => [UserRole::HrManager],
    'recruiter' => [UserRole::Recruiter],
]);

dataset('non-managing roles', [
    'interviewer' => [UserRole::Interviewer],
]);

test('recruiter+ in the org may create, update and delete', function (UserRole $role) {
    $user = User::factory()->for($this->acme)->role($role)->create();

    expect($user->can('create', Job::class))->toBeTrue()
        ->and($user->can('update', $this->job))->toBeTrue()
        ->and($user->can('delete', $this->job))->toBeTrue();
})->with('managing roles');

test('under-privileged org members may not create, update or delete', function (UserRole $role) {
    $user = User::factory()->for($this->acme)->role($role)->create();

    expect($user->can('create', Job::class))->toBeFalse()
        ->and($user->can('update', $this->job))->toBeFalse()
        ->and($user->can('delete', $this->job))->toBeFalse();
})->with('non-managing roles');

test('any authed org member may view jobs in their org', function (UserRole $role) {
    $user = User::factory()->for($this->acme)->role($role)->create();

    expect($user->can('viewAny', Job::class))->toBeTrue()
        ->and($user->can('view', $this->job))->toBeTrue();
})->with('managing roles')->with('non-managing roles');

test('a recruiter from another org may not touch this org jobs', function () {
    $outsider = User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

    expect($outsider->can('view', $this->job))->toBeFalse()
        ->and($outsider->can('update', $this->job))->toBeFalse()
        ->and($outsider->can('delete', $this->job))->toBeFalse();
});

test('a super admin may manage jobs in any org', function () {
    $admin = User::factory()->superAdmin()->create();

    expect($admin->can('create', Job::class))->toBeTrue()
        ->and($admin->can('update', $this->job))->toBeTrue()
        ->and($admin->can('delete', $this->job))->toBeTrue()
        ->and($admin->can('view', $this->job))->toBeTrue();
});

test('a candidate without an org may not view or manage jobs', function () {
    $candidate = User::factory()->candidate()->create();

    expect($candidate->can('viewAny', Job::class))->toBeFalse()
        ->and($candidate->can('create', Job::class))->toBeFalse()
        ->and($candidate->can('view', $this->job))->toBeFalse();
});
