<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;

test('role is cast to the enum', function () {
    $user = User::factory()->role(UserRole::HrManager)->create();

    expect($user->fresh()->role)->toBe(UserRole::HrManager);
});

test('role defaults to candidate when not supplied', function () {
    $id = DB::table('users')->insertGetId([
        'name' => 'No Role',
        'email' => 'no-role@example.test',
        'password' => 'x',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(User::find($id)->role)->toBe(UserRole::Candidate);
});

test('hasRole matches any of the given roles', function () {
    $user = User::factory()->role(UserRole::Recruiter)->create();

    expect($user->hasRole(UserRole::Recruiter))->toBeTrue()
        ->and($user->hasRole(UserRole::HrManager, UserRole::Recruiter))->toBeTrue()
        ->and($user->hasRole(UserRole::Interviewer))->toBeFalse();
});

test('role predicate is true only for its own role', function (UserRole $role, string $predicate) {
    $user = User::factory()->role($role)->create();

    $predicates = [
        'isSuperAdmin', 'isHrManager', 'isRecruiter', 'isInterviewer', 'isCandidate',
    ];

    foreach ($predicates as $candidate) {
        expect($user->{$candidate}())->toBe($candidate === $predicate);
    }
})->with([
    'super admin' => [UserRole::SuperAdmin, 'isSuperAdmin'],
    'hr manager' => [UserRole::HrManager, 'isHrManager'],
    'recruiter' => [UserRole::Recruiter, 'isRecruiter'],
    'interviewer' => [UserRole::Interviewer, 'isInterviewer'],
    'candidate' => [UserRole::Candidate, 'isCandidate'],
]);

test('isStaff covers the org facing roles only', function (UserRole $role, bool $expected) {
    expect(User::factory()->role($role)->create()->isStaff())->toBe($expected);
})->with([
    [UserRole::SuperAdmin, false],
    [UserRole::HrManager, true],
    [UserRole::Recruiter, true],
    [UserRole::Interviewer, true],
    [UserRole::Candidate, false],
]);

test('belongsToOrganization compares the users organization', function () {
    $acme = Organization::factory()->create();
    $globex = Organization::factory()->create();
    $user = User::factory()->for($acme)->create();

    expect($user->belongsToOrganization($acme))->toBeTrue()
        ->and($user->belongsToOrganization($globex))->toBeFalse();
});

test('the password is hashed and hidden from serialization', function () {
    $user = User::factory()->create();

    expect($user->password)->not->toBe('password')
        ->and($user->toArray())->not->toHaveKey('password')
        ->and($user->toArray())->not->toHaveKey('remember_token');
});
