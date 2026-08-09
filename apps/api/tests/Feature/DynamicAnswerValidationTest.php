<?php

use App\Enums\FieldType;
use App\Models\ApplicationField;
use App\Models\Job;
use App\Models\Organization;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('cv');
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->job = Job::factory()->for($this->acme)->published()->create();

    ApplicationField::factory()->for($this->job)->create([
        'key' => 'years_experience', 'type' => FieldType::Number, 'required' => true, 'order' => 0,
    ]);
    ApplicationField::factory()->for($this->job)->create([
        'key' => 'has_work_permit', 'type' => FieldType::Boolean, 'required' => false, 'order' => 1,
    ]);
    ApplicationField::factory()->for($this->job)->create([
        'key' => 'degree', 'type' => FieldType::Select, 'required' => false,
        'options' => ['bsc', 'msc'], 'order' => 2,
    ]);
    ApplicationField::factory()->for($this->job)->create([
        'key' => 'skills', 'type' => FieldType::Multiselect, 'required' => false,
        'options' => ['php', 'react'], 'order' => 3,
    ]);
    ApplicationField::factory()->for($this->job)->create([
        'key' => 'available_from', 'type' => FieldType::Date, 'required' => false, 'order' => 4,
    ]);
});

function answerPayload(array $answers): array
{
    Storage::disk('cv')->put('cv/v.pdf', "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

    return [
        'full_name' => 'Cora Candidate',
        'email' => 'cora@example.com',
        'cv_key' => 'cv/v.pdf',
        'cv_original_name' => 'cora-cv.pdf',
        'answers' => $answers,
    ];
}

function postAnswers(array $answers)
{
    return test()->postJson('/api/public/o/acme/jobs/'.test()->job->id.'/apply', answerPayload($answers));
}

test('a required field must be answered', function () {
    postAnswers(['has_work_permit' => true])
        ->assertStatus(422)
        ->assertJsonValidationErrors('answers.years_experience');
});

test('an unknown field key is rejected', function () {
    postAnswers(['years_experience' => 3, 'salary_expectation' => 90000])
        ->assertStatus(422)
        ->assertJsonValidationErrors('answers.salary_expectation');
});

dataset('typed answers', [
    'number rejects text' => ['years_experience', 'quite a few', false],
    'number accepts an integer' => ['years_experience', 4, true],
    'number accepts a numeric string' => ['years_experience', '4', true],
    'boolean rejects text' => ['has_work_permit', 'maybe', false],
    'boolean accepts a flag' => ['has_work_permit', true, true],
    'select rejects an unlisted option' => ['degree', 'phd', false],
    'select accepts a listed option' => ['degree', 'msc', true],
    'multiselect rejects a scalar' => ['skills', 'php', false],
    'multiselect rejects an unlisted member' => ['skills', ['cobol'], false, 'answers.skills.0'],
    'multiselect accepts listed members' => ['skills', ['php', 'react'], true],
    'date rejects nonsense' => ['available_from', 'someday', false],
    'date accepts an iso date' => ['available_from', '2026-09-01', true],
]);

test('answers are validated against their field definition', function (string $key, mixed $value, bool $valid, ?string $errorKey = null) {
    $response = postAnswers(array_merge(['years_experience' => 3], [$key => $value]));

    $valid
        ? $response->assertCreated()
        : $response->assertStatus(422)->assertJsonValidationErrors($errorKey ?? "answers.{$key}");
})->with('typed answers');

test('an optional field may be omitted entirely', function () {
    postAnswers(['years_experience' => 3])->assertCreated();
});
