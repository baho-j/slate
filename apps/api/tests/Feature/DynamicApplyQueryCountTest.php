<?php

use App\Enums\FieldType;
use App\Models\ApplicationField;
use App\Models\Job;
use App\Models\Organization;
use App\Models\ScreeningCriterion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

function jobWithFields(Organization $organization, int $count): Job
{
    $job = Job::factory()->for($organization)->published()->create();

    foreach (range(0, $count - 1) as $i) {
        ApplicationField::factory()->for($job)->create([
            'key' => "f{$i}", 'type' => FieldType::Number, 'required' => false, 'order' => $i,
        ]);
        ScreeningCriterion::factory()->for($job)->create(['field_key' => "f{$i}"]);
    }

    return $job;
}

function countApplyQueries(Job $job, int $fieldCount, string $email): int
{
    Storage::disk('cv')->put('cv/n.pdf', "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

    $answers = [];
    foreach (range(0, $fieldCount - 1) as $i) {
        $answers["f{$i}"] = 5;
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    test()->postJson("/api/public/o/{$job->organization->slug}/jobs/{$job->id}/apply", [
        'full_name' => 'Cora Candidate',
        'email' => $email,
        'cv_key' => 'cv/n.pdf',
        'cv_original_name' => 'cora-cv.pdf',
        'answers' => $answers,
    ])->assertCreated();

    return count(DB::getQueryLog());
}

test('public job detail loads its fields and criteria without an N+1', function () {
    Storage::fake('cv');
    $acme = Organization::factory()->create(['slug' => 'acme']);
    $job = jobWithFields($acme, 20);

    DB::enableQueryLog();
    $this->getJson("/api/public/o/acme/jobs/{$job->id}")->assertOk();

    expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(5);
});

test('submitting answers costs the same number of queries regardless of field count', function () {
    Storage::fake('cv');
    $acme = Organization::factory()->create(['slug' => 'acme']);

    countApplyQueries(jobWithFields($acme, 1), 1, 'warmup@example.com');

    $small = countApplyQueries(jobWithFields($acme, 3), 3, 'small@example.com');
    $large = countApplyQueries(jobWithFields($acme, 30), 30, 'large@example.com');

    expect($large)->toBe($small);
});
