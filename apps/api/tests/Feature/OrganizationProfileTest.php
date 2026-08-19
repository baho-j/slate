<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['slug' => 'acme', 'name' => 'Acme Inc.']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);

    $this->hr = User::factory()->for($this->acme)->role(UserRole::HrManager)->create();
    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
});

describe('viewing the org profile', function () {
    test('any staff member sees their own org', function () {
        $this->actingAs($this->recruiter)
            ->getJson('/api/organizations/current')
            ->assertOk()
            ->assertJsonPath('data.slug', 'acme')
            ->assertJsonPath('data.name', 'Acme Inc.');
    });

    test('the profile requires authentication', function () {
        $this->getJson('/api/organizations/current')->assertUnauthorized();
    });
});

describe('editing the org profile', function () {
    test('an hr manager updates the profile', function () {
        $this->actingAs($this->hr)
            ->patchJson('/api/organizations/current', [
                'name' => 'Acme Corp',
                'description' => 'We build things.',
                'website' => 'https://acme.example',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Acme Corp')
            ->assertJsonPath('data.website', 'https://acme.example');

        expect($this->acme->fresh()->name)->toBe('Acme Corp');
    });

    test('a recruiter cannot edit the profile', function () {
        $this->actingAs($this->recruiter)
            ->patchJson('/api/organizations/current', ['name' => 'Hacme'])
            ->assertForbidden();

        expect($this->acme->fresh()->name)->toBe('Acme Inc.');
    });

    test('an unknown field is rejected', function () {
        $this->actingAs($this->hr)
            ->patchJson('/api/organizations/current', ['slug' => 'stolen'])
            ->assertUnprocessable();

        expect($this->acme->fresh()->slug)->toBe('acme');
    });

    test('the website must be a url', function () {
        $this->actingAs($this->hr)
            ->patchJson('/api/organizations/current', ['website' => 'not-a-url'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('website');
    });

    test('a verified logo upload is stored as a public url', function () {
        Storage::fake('logo');
        Storage::disk('logo')->put('logos/brand.png', str_repeat("\x89PNG\r\n", 4));

        $this->actingAs($this->hr)
            ->patchJson('/api/organizations/current', ['logo_key' => 'logos/brand.png'])
            ->assertOk()
            ->assertJsonPath('data.logo_url', fn ($url) => str_contains((string) $url, 'logos/brand.png'));
    });

    test('a logo key that was never uploaded is rejected', function () {
        Storage::fake('logo');

        $this->actingAs($this->hr)
            ->patchJson('/api/organizations/current', ['logo_key' => 'logos/ghost.png'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('logo_key');
    });
});
