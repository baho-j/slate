<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->withHeader('Origin', 'http://localhost');
});

test('a user can log in with valid credentials', function () {
    $user = User::factory()->create(['password' => Hash::make('secret-pass')]);

    $response = $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'secret-pass',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonMissingPath('data.password');

    $this->assertAuthenticatedAs($user);
});

test('login fails with the wrong password', function () {
    $user = User::factory()->create(['password' => Hash::make('secret-pass')]);

    $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'wrong-pass',
    ])->assertUnauthorized();

    $this->assertGuest();
});

test('login validates required fields', function () {
    $this->postJson('/api/auth/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);
});

test('me returns the authenticated user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.role', $user->role->value);
});

test('me requires authentication', function () {
    $this->getJson('/api/auth/me')->assertUnauthorized();
});

test('a user can log out', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/auth/logout')
        ->assertNoContent();
});

test('logout requires authentication', function () {
    $this->postJson('/api/auth/logout')->assertUnauthorized();
});

test('login is rate limited after repeated failures', function () {
    $user = User::factory()->create(['password' => Hash::make('secret-pass')]);

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-pass',
        ])->assertUnauthorized();
    }

    $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'wrong-pass',
    ])->assertStatus(429);
});
