<?php

use App\Enums\CriterionMode;
use App\Enums\CriterionOperator;
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

    ApplicationField::factory()->for($this->job)->type(FieldType::Number)->create(['key' => 'years_experience']);
    ApplicationField::factory()->for($this->job)->type(FieldType::Boolean)->create(['key' => 'has_work_permit']);
    ApplicationField::factory()->for($this->job)->type(FieldType::Multiselect)->create(['key' => 'skills']);
});

function criteriaPayload(array $rules): array
{
    return ['criteria' => $rules];
}

function knockoutRule(array $overrides = []): array
{
    return array_merge([
        'field_key' => 'years_experience',
        'operator' => CriterionOperator::Gte->value,
        'value' => 3,
        'mode' => CriterionMode::Knockout->value,
    ], $overrides);
}

test('index returns the job criteria', function () {
    ScreeningCriterion::factory()->for($this->job)->count(2)->create();

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/criteria")
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('put replaces the whole rule set', function () {
    ScreeningCriterion::factory()->for($this->job)->create(['field_key' => 'years_experience']);

    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([
            knockoutRule(['field_key' => 'has_work_permit', 'operator' => CriterionOperator::Eq->value, 'value' => true]),
            knockoutRule([
                'field_key' => 'skills', 'operator' => CriterionOperator::IncludesAll->value,
                'value' => ['php', 'react'], 'mode' => CriterionMode::Scored->value, 'weight' => 30,
            ]),
        ]))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.1.weight', 30);

    expect($this->job->screeningCriteria()->count())->toBe(2);
});

test('put with an empty set clears all rules', function () {
    ScreeningCriterion::factory()->for($this->job)->create();

    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([]))
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('put rejects a field_key that is not on the job', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([
            knockoutRule(['field_key' => 'nonexistent']),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['criteria.0.field_key']);
});

test('put rejects an unknown operator', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([
            knockoutRule(['operator' => 'between']),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['criteria.0.operator']);
});

test('put rejects gte on a boolean field', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([
            knockoutRule(['field_key' => 'has_work_permit', 'operator' => CriterionOperator::Gte->value]),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['criteria.0.operator']);
});

test('put rejects includes_all on a number field', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([
            knockoutRule(['operator' => CriterionOperator::IncludesAll->value, 'value' => ['x']]),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['criteria.0.operator']);
});

test('put requires a weight for scored rules', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([
            knockoutRule(['mode' => CriterionMode::Scored->value]),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['criteria.0.weight']);
});

test('put forbids a weight on knockout rules', function () {
    $this->actingAs($this->recruiter)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([
            knockoutRule(['weight' => 10]),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['criteria.0.weight']);
});

test('an interviewer cannot manage criteria', function () {
    $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

    $this->actingAs($interviewer)
        ->getJson("/api/jobs/{$this->job->id}/criteria")
        ->assertForbidden();

    $this->actingAs($interviewer)
        ->putJson("/api/jobs/{$this->job->id}/criteria", criteriaPayload([knockoutRule()]))
        ->assertForbidden();
});

test('criteria on a job from another org return 404', function () {
    $foreign = Job::factory()->for($this->globex)->create();

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$foreign->id}/criteria")
        ->assertNotFound();
});

test('managing criteria requires authentication', function () {
    $this->getJson("/api/jobs/{$this->job->id}/criteria")->assertUnauthorized();
});
