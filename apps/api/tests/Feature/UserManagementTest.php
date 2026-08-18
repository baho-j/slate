<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);

    $this->hr = User::factory()->for($this->acme)->role(UserRole::HrManager)->create();
    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
});

describe('listing users', function () {
    test('an hr manager lists their org members only', function () {
        User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();
        User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

        $response = $this->actingAs($this->hr)->getJson('/api/users')->assertOk();

        $orgIds = collect($response->json('data'))->pluck('organization_id')->unique();
        expect($orgIds->all())->toBe([$this->acme->id]);
    });

    test('a non-hr staff member cannot list users', function (UserRole $role) {
        $actor = User::factory()->for($this->acme)->role($role)->create();

        $this->actingAs($actor)->getJson('/api/users')->assertForbidden();
    })->with([
        'recruiter' => [UserRole::Recruiter],
        'interviewer' => [UserRole::Interviewer],
        'candidate' => [UserRole::Candidate],
    ]);

    test('listing users requires authentication', function () {
        $this->getJson('/api/users')->assertUnauthorized();
    });
});

describe('creating users', function () {
    test('an hr manager invites a recruiter into their org', function () {
        $this->actingAs($this->hr)
            ->postJson('/api/users', [
                'name' => 'Rita Recruiter',
                'email' => 'rita@acme.test',
                'role' => 'recruiter',
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'recruiter')
            ->assertJsonPath('data.organization_id', $this->acme->id);

        $created = User::where('email', 'rita@acme.test')->firstOrFail();
        expect($created->organization_id)->toBe($this->acme->id);
    });

    test('an hr manager cannot create a super_admin', function () {
        $this->actingAs($this->hr)
            ->postJson('/api/users', [
                'name' => 'Sneaky',
                'email' => 'sneaky@acme.test',
                'role' => 'super_admin',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        expect(User::where('email', 'sneaky@acme.test')->exists())->toBeFalse();
    });

    test('a created user lands in the actor org even if another is supplied', function () {
        $this->actingAs($this->hr)
            ->postJson('/api/users', [
                'name' => 'Cross Org',
                'email' => 'cross@acme.test',
                'role' => 'recruiter',
                'organization_id' => $this->globex->id,
            ])
            ->assertCreated();

        expect(User::where('email', 'cross@acme.test')->first()->organization_id)->toBe($this->acme->id);
    });

    test('a recruiter cannot create users', function () {
        $this->actingAs($this->recruiter)
            ->postJson('/api/users', ['name' => 'X', 'email' => 'x@acme.test', 'role' => 'interviewer'])
            ->assertForbidden();
    });

    test('the email must be unique', function () {
        $this->actingAs($this->hr)
            ->postJson('/api/users', ['name' => 'Dup', 'email' => $this->recruiter->email, 'role' => 'recruiter'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    });
});

describe('updating users', function () {
    test('an hr manager changes a member role', function () {
        $member = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

        $this->actingAs($this->hr)
            ->patchJson("/api/users/{$member->id}", ['role' => 'recruiter'])
            ->assertOk()
            ->assertJsonPath('data.role', 'recruiter');

        expect($member->fresh()->role)->toBe(UserRole::Recruiter);
    });

    test('an hr manager cannot escalate a user to super_admin', function () {
        $member = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();

        $this->actingAs($this->hr)
            ->patchJson("/api/users/{$member->id}", ['role' => 'super_admin'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        expect($member->fresh()->role)->toBe(UserRole::Recruiter);
    });

    test('moving a user into another org is rejected', function () {
        $member = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();

        $this->actingAs($this->hr)
            ->patchJson("/api/users/{$member->id}", ['organization_id' => $this->globex->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('organization_id');

        expect($member->fresh()->organization_id)->toBe($this->acme->id);
    });

    test('an hr manager cannot edit a user in another org', function () {
        $outsider = User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

        $this->actingAs($this->hr)
            ->patchJson("/api/users/{$outsider->id}", ['role' => 'interviewer'])
            ->assertForbidden();
    });

    test('demoting the last hr manager is refused', function () {
        // $this->hr is the only hr_manager in acme.
        $this->actingAs($this->hr)
            ->patchJson("/api/users/{$this->hr->id}", ['role' => 'recruiter'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        expect($this->hr->fresh()->role)->toBe(UserRole::HrManager);
    });

    test('the last hr manager can be demoted once another exists', function () {
        User::factory()->for($this->acme)->role(UserRole::HrManager)->create();

        $this->actingAs($this->hr)
            ->patchJson("/api/users/{$this->hr->id}", ['role' => 'recruiter'])
            ->assertOk();
    });
});

describe('deleting users', function () {
    test('an hr manager removes a member', function () {
        $member = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

        $this->actingAs($this->hr)
            ->deleteJson("/api/users/{$member->id}")
            ->assertNoContent();

        expect(User::find($member->id))->toBeNull();
    });

    test('deleting the last hr manager is refused', function () {
        $this->actingAs($this->hr)
            ->deleteJson("/api/users/{$this->hr->id}")
            ->assertUnprocessable();

        expect(User::find($this->hr->id))->not->toBeNull();
    });

    test('an hr manager cannot delete a user in another org', function () {
        $outsider = User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

        $this->actingAs($this->hr)
            ->deleteJson("/api/users/{$outsider->id}")
            ->assertForbidden();

        expect(User::find($outsider->id))->not->toBeNull();
    });
});

describe('role changes take effect immediately', function () {
    test('a demoted hr manager loses user-management access on the next request', function () {
        $second = User::factory()->for($this->acme)->role(UserRole::HrManager)->create();

        // Second HR manager can list users...
        $this->actingAs($second)->getJson('/api/users')->assertOk();

        // ...then the first HR manager demotes them.
        $this->actingAs($this->hr)
            ->patchJson("/api/users/{$second->id}", ['role' => 'recruiter'])
            ->assertOk();

        // The very next request from the demoted user is already forbidden — no stale window.
        $this->actingAs($second->fresh())->getJson('/api/users')->assertForbidden();
    });
});
