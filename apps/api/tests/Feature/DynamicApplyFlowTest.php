<?php

use App\Enums\CriterionMode;
use App\Enums\CriterionOperator;
use App\Enums\FieldType;
use App\Enums\IneligibleHandling;
use App\Models\Application;
use App\Models\ApplicationField;
use App\Models\Job;
use App\Models\Organization;
use App\Models\ScreeningCriterion;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('cv');
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->job = Job::factory()->for($this->acme)->published()->create();

    $this->years = ApplicationField::factory()->for($this->job)->create([
        'key' => 'years_experience', 'label' => 'Years of experience', 'type' => FieldType::Number,
        'required' => true, 'order' => 0,
    ]);
    $this->permit = ApplicationField::factory()->for($this->job)->create([
        'key' => 'has_work_permit', 'label' => 'Work permit', 'type' => FieldType::Boolean,
        'required' => true, 'order' => 1,
    ]);
    $this->skills = ApplicationField::factory()->for($this->job)->create([
        'key' => 'skills', 'label' => 'Skills', 'type' => FieldType::Multiselect,
        'required' => false, 'options' => ['php', 'react', 'go'], 'order' => 2,
    ]);
    $this->degree = ApplicationField::factory()->for($this->job)->create([
        'key' => 'degree', 'label' => 'Degree', 'type' => FieldType::Select,
        'required' => false, 'options' => ['bsc', 'msc', 'phd'], 'order' => 3,
    ]);
});

function dynamicPayload(array $answers, array $overrides = []): array
{
    Storage::disk('cv')->put('cv/dyn.pdf', "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

    return array_merge([
        'full_name' => 'Cora Candidate',
        'email' => 'cora@example.com',
        'cv_key' => 'cv/dyn.pdf',
        'cv_original_name' => 'cora-cv.pdf',
        'answers' => $answers,
    ], $overrides);
}

function knockoutRules(Job $job): void
{
    ScreeningCriterion::factory()->for($job)->create([
        'field_key' => 'years_experience', 'operator' => CriterionOperator::Gte,
        'value' => 3, 'mode' => CriterionMode::Knockout,
    ]);
    ScreeningCriterion::factory()->for($job)->create([
        'field_key' => 'has_work_permit', 'operator' => CriterionOperator::Eq,
        'value' => true, 'mode' => CriterionMode::Knockout,
    ]);
}

function submittedApplication(): Application
{
    return Application::withoutGlobalScopes()->latest('created_at')->firstOrFail();
}

test('public job detail returns the job with its fields in order', function () {
    $this->getJson("/api/public/o/acme/jobs/{$this->job->id}")
        ->assertOk()
        ->assertJsonPath('data.fields.0.key', 'years_experience')
        ->assertJsonPath('data.fields.0.type', 'number')
        ->assertJsonPath('data.fields.0.required', true)
        ->assertJsonPath('data.fields.2.key', 'skills')
        ->assertJsonPath('data.fields.2.options', ['php', 'react', 'go'])
        ->assertJsonCount(4, 'data.fields');
});

test('public job detail exposes criteria without their weights', function () {
    ScreeningCriterion::factory()->for($this->job)->scored(30)->create([
        'field_key' => 'skills', 'operator' => CriterionOperator::IncludesAll, 'value' => ['php'],
    ]);

    $response = $this->getJson("/api/public/o/acme/jobs/{$this->job->id}")->assertOk();

    expect($response->json('data.criteria.0'))
        ->toHaveKeys(['field_key', 'operator', 'value', 'mode'])
        ->not->toHaveKey('weight');
});

test('answers persist against their field and the evaluator runs on submit', function () {
    knockoutRules($this->job);
    ScreeningCriterion::factory()->for($this->job)->scored(30)->create([
        'field_key' => 'skills', 'operator' => CriterionOperator::IncludesAll, 'value' => ['php', 'react'],
    ]);
    ScreeningCriterion::factory()->for($this->job)->scored(20)->create([
        'field_key' => 'degree', 'operator' => CriterionOperator::In, 'value' => ['bsc', 'msc'],
    ]);

    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", dynamicPayload([
        'years_experience' => 6,
        'has_work_permit' => true,
        'skills' => ['php', 'react'],
        'degree' => 'msc',
    ]))->assertCreated();

    $application = submittedApplication();

    expect($application->eligibility->value)->toBe('eligible')
        ->and($application->match_score)->toBe(100)
        ->and($application->status->value)->toBe('applied');

    $this->assertDatabaseHas('application_answers', [
        'application_id' => $application->id,
        'field_id' => $this->years->id,
        'field_key' => 'years_experience',
    ]);

    expect($application->answers()->count())->toBe(4)
        ->and($application->answers()->where('field_key', 'skills')->first()->value)->toBe(['php', 'react']);
});

test('a failed knockout stores ineligible but still flags rather than rejects by default', function () {
    knockoutRules($this->job);

    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", dynamicPayload([
        'years_experience' => 1,
        'has_work_permit' => true,
    ]))->assertCreated();

    $application = submittedApplication();

    expect($this->job->on_ineligible)->toBe(IneligibleHandling::Flag)
        ->and($application->eligibility->value)->toBe('ineligible')
        ->and($application->status->value)->toBe('applied');
});

test('a job set to reject moves an ineligible application straight to rejected', function () {
    $this->job->update(['on_ineligible' => IneligibleHandling::Reject]);
    knockoutRules($this->job);

    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", dynamicPayload([
        'years_experience' => 1,
        'has_work_permit' => true,
    ]))->assertCreated();

    expect(submittedApplication()->status->value)->toBe('rejected');
});

test('an unanswerable scored rule flags the application for manual review', function () {
    ScreeningCriterion::factory()->for($this->job)->scored(30)->create([
        'field_key' => 'skills', 'operator' => CriterionOperator::IncludesAll, 'value' => ['php'],
    ]);

    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", dynamicPayload([
        'years_experience' => 5,
        'has_work_permit' => true,
    ]))->assertCreated();

    $application = submittedApplication();

    expect($application->eligibility->value)->toBe('manual')
        ->and($application->match_score)->toBe(0);
});

test('the submission history row records the screening outcome', function () {
    knockoutRules($this->job);

    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", dynamicPayload([
        'years_experience' => 9,
        'has_work_permit' => true,
    ]))->assertCreated();

    $this->assertDatabaseHas('application_status_history', [
        'application_id' => submittedApplication()->id,
        'to_status' => 'applied',
        'note' => 'Application submitted. Screening: eligible.',
    ]);
});

test('a job with no fields still accepts an application and scores nothing', function () {
    $bare = Job::factory()->for($this->acme)->published()->create();

    $this->postJson("/api/public/o/acme/jobs/{$bare->id}/apply", dynamicPayload([]))
        ->assertCreated();

    $application = submittedApplication();

    expect($application->eligibility->value)->toBe('eligible')
        ->and($application->match_score)->toBeNull()
        ->and($application->answers()->count())->toBe(0);
});

test('the public apply endpoint is still rate limited', function () {
    foreach (range(1, 60) as $i) {
        $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", dynamicPayload([
            'years_experience' => 4,
        ], ['email' => "cora{$i}@example.com"]));
    }

    $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", dynamicPayload([
        'years_experience' => 4,
    ], ['email' => 'over@example.com']))->assertStatus(429);
});
