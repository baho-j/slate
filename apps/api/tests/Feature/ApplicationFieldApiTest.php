<?php

use App\Enums\FieldType;
use App\Enums\UserRole;
use App\Models\ApplicationField;
use App\Models\Job;
use App\Models\Organization;
use App\Models\ScreeningCriterion;
use App\Models\User;

beforeEach(function () {
    $this->acme = Organization::factory()->create();
    $this->globex = Organization::factory()->create();
    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
    $this->job = Job::factory()->for($this->acme)->create();
});

function fieldPayload(array $fields): array
{
    return ['fields' => $fields];
}

function validField(array $overrides = []): array
{
    return array_merge([
        'label' => 'Years of experience',
        'key' => 'years_experience',
        'type' => FieldType::Number->value,
        'required' => true,
        'order' => 0,
    ], $overrides);
}

test('index returns the job fields ordered', function () {
    ApplicationField::factory()->for($this->job)->create(['key' => 'b', 'order' => 1]);
    ApplicationField::factory()->for($this->job)->create(['key' => 'a', 'order' => 0]);

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/fields")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.key', 'a')
        ->assertJsonPath('data.1.key', 'b');
});

test('put replaces the whole ordered set', function () {
    ApplicationField::factory()->for($this->job)->create(['key' => 'stale']);

    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([
            validField(),
            validField([
                'label' => 'Skills', 'key' => 'skills', 'type' => FieldType::Multiselect->value,
                'required' => false, 'order' => 1, 'options' => ['php', 'react'],
            ]),
        ]))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.1.options', ['php', 'react']);

    $this->assertDatabaseMissing('application_fields', ['job_id' => $this->job->id, 'key' => 'stale']);
    $this->assertDatabaseHas('application_fields', ['job_id' => $this->job->id, 'key' => 'years_experience']);
});

test('put with an empty set clears all fields', function () {
    ApplicationField::factory()->for($this->job)->create();

    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([]))
        ->assertOk()
        ->assertJsonCount(0, 'data');

    expect($this->job->applicationFields()->count())->toBe(0);
});

test('put rejects a non snake_case key', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([validField(['key' => 'Years Experience'])]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['fields.0.key']);
});

test('put rejects duplicate keys within the payload', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([
            validField(),
            validField(['label' => 'Again', 'order' => 1]),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['fields.0.key', 'fields.1.key']);
});

test('put requires options for select fields', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([
            validField(['key' => 'degree', 'type' => FieldType::Select->value]),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['fields.0.options']);
});

test('put forbids options on non-select fields', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([
            validField(['options' => ['nope']]),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['fields.0.options']);
});

test('put rejects an unknown field type', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([validField(['type' => 'colour'])]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['fields.0.type']);
});

test('an interviewer cannot manage fields', function () {
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

    $this->actingAs($interviewer)
        ->getJson("/api/jobs/{$this->job->id}/fields")
        ->assertForbidden();

    $this->actingAs($interviewer)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([validField()]))
        ->assertForbidden();
});

test('fields on a job from another org return 404', function () {
    $foreign = Job::factory()->for($this->globex)->create();

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$foreign->id}/fields")
        ->assertNotFound();

    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$foreign->id}/fields", fieldPayload([validField()]))
        ->assertNotFound();
});

test('put refuses to remove a field referenced by screening criteria', function () {
    ApplicationField::factory()->for($this->job)->create(['key' => 'years_experience']);
    ScreeningCriterion::factory()->for($this->job)->create(['field_key' => 'years_experience']);

    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([
            validField(['key' => 'other_field']),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['fields']);

    $this->assertDatabaseHas('application_fields', ['job_id' => $this->job->id, 'key' => 'years_experience']);
});

test('put allows the replacement when referenced keys are kept', function () {
    ApplicationField::factory()->for($this->job)->create(['key' => 'years_experience']);
    ScreeningCriterion::factory()->for($this->job)->create(['field_key' => 'years_experience']);

    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/fields", fieldPayload([validField()]))
        ->assertOk();
});

test('managing fields requires authentication', function () {
    $this->getJson("/api/jobs/{$this->job->id}/fields")->assertUnauthorized();
});
