<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\QueryException;

test('an organization has many users', function () {
    $organization = Organization::factory()->create();
    User::factory()->count(3)->for($organization)->create();

    expect($organization->users)->toHaveCount(3)
        ->and($organization->users->first())->toBeInstanceOf(User::class);
});

test('a user belongs to an organization', function () {
    $organization = Organization::factory()->create();
    $user = User::factory()->for($organization)->create();

    expect($user->organization->id)->toBe($organization->id);
});

test('organization slug is unique', function () {
    Organization::factory()->create(['slug' => 'acme']);

    Organization::factory()->create(['slug' => 'acme']);
})->throws(QueryException::class);

test('an organization is resolved by slug in routes', function () {
    expect((new Organization)->getRouteKeyName())->toBe('slug');
});

test('deleting an organization cascades to its users', function () {
    $organization = Organization::factory()->create();
    $user = User::factory()->for($organization)->create();

    $organization->delete();

    expect(User::find($user->id))->toBeNull();
});

test('a super admin and a candidate may exist without an organization', function () {
    $superAdmin = User::factory()->superAdmin()->create();
    $candidate = User::factory()->candidate()->create();

    expect($superAdmin->organization_id)->toBeNull()
        ->and($candidate->organization_id)->toBeNull();
});
