<?php

use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rebuilds the pre-migration shape (one pipeline per organization) and replays the
 * migration over it, because migrations have already run by the time tests boot.
 */
function migration(): object
{
    return require database_path('migrations/2026_08_10_120000_move_pipelines_to_jobs.php');
}

function revertToOrganizationPipelines(): void
{
    migration()->down();
}

beforeEach(function () {
    revertToOrganizationPipelines();

    $this->acme = Organization::factory()->create();
    $this->hr = User::factory()->for($this->acme)->create();

    $this->pipelineId = DB::table('pipelines')->insertGetId([
        'organization_id' => $this->acme->id,
        'name' => 'Company Standard',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->stageIds = collect([
        ['name' => 'Applied', 'order' => 1, 'is_terminal' => false],
        ['name' => 'Interview', 'order' => 2, 'is_terminal' => false],
        ['name' => 'Hired', 'order' => 3, 'is_terminal' => true],
    ])->mapWithKeys(fn (array $stage) => [
        $stage['name'] => DB::table('pipeline_stages')->insertGetId($stage + [
            'pipeline_id' => $this->pipelineId,
            'created_at' => now(),
            'updated_at' => now(),
        ]),
    ]);
});

function applicationAt(Job $job, int $stageId): Application
{
    return Application::factory()
        ->for($job)
        ->for(Candidate::factory())
        ->create(['current_stage_id' => $stageId]);
}

test('every job comes out of the migration with its own pipeline', function () {
    $first = Job::factory()->for($this->acme)->create();
    $second = Job::factory()->for($this->acme)->create();

    migration()->up();

    $pipelines = DB::table('pipelines')->pluck('job_id');

    expect($pipelines)->toHaveCount(2);
    expect($pipelines->sort()->values()->all())->toBe(collect([$first->id, $second->id])->sort()->values()->all());
});

test('the cloned stages keep the names, order and terminal flags of the original', function () {
    $job = Job::factory()->for($this->acme)->create();

    migration()->up();

    $stages = DB::table('pipeline_stages')
        ->join('pipelines', 'pipelines.id', '=', 'pipeline_stages.pipeline_id')
        ->where('pipelines.job_id', $job->id)
        ->orderBy('pipeline_stages.order')
        ->get(['pipeline_stages.name', 'pipeline_stages.order', 'pipeline_stages.is_terminal']);

    expect($stages->pluck('name')->all())->toBe(['Applied', 'Interview', 'Hired']);
    expect($stages->pluck('order')->all())->toBe([1, 2, 3]);
    expect((bool) $stages->last()->is_terminal)->toBeTrue();
});

test('an application keeps the stage it was sitting in', function () {
    $job = Job::factory()->for($this->acme)->create();
    $application = applicationAt($job, $this->stageIds['Interview']);

    migration()->up();

    $stage = DB::table('pipeline_stages')
        ->join('pipelines', 'pipelines.id', '=', 'pipeline_stages.pipeline_id')
        ->where('pipeline_stages.id', $application->fresh()->current_stage_id)
        ->first(['pipeline_stages.name', 'pipelines.job_id']);

    expect($stage->name)->toBe('Interview');
    expect($stage->job_id)->toBe($job->id);
});

test('two jobs sharing a stage name end up on their own copies of it', function () {
    $first = Job::factory()->for($this->acme)->create();
    $second = Job::factory()->for($this->acme)->create();

    $a = applicationAt($first, $this->stageIds['Applied']);
    $b = applicationAt($second, $this->stageIds['Applied']);

    migration()->up();

    $stageOf = fn (Application $application) => $application->fresh()->current_stage_id;

    expect($stageOf($a))->not->toBe($stageOf($b));

    $names = DB::table('pipeline_stages')->whereIn('id', [$stageOf($a), $stageOf($b)])->pluck('name');
    expect($names->all())->toBe(['Applied', 'Applied']);
});

test('status history is repointed onto the cloned stages', function () {
    $job = Job::factory()->for($this->acme)->create();
    $application = applicationAt($job, $this->stageIds['Interview']);

    DB::table('application_status_history')->insert([
        'application_id' => $application->id,
        'from_stage_id' => $this->stageIds['Applied'],
        'to_stage_id' => $this->stageIds['Interview'],
        'from_status' => 'applied',
        'to_status' => 'applied',
        'changed_by' => $this->hr->id,
        'created_at' => now(),
    ]);

    migration()->up();

    $entry = DB::table('application_status_history')->where('application_id', $application->id)->first();

    $nameOf = fn (?int $id) => DB::table('pipeline_stages')->where('id', $id)->value('name');

    expect($nameOf($entry->from_stage_id))->toBe('Applied');
    expect($nameOf($entry->to_stage_id))->toBe('Interview');
    expect($entry->from_stage_id)->not->toBe($this->stageIds['Applied']);
});

test('history rows with no stage stay null', function () {
    $job = Job::factory()->for($this->acme)->create();
    $application = applicationAt($job, $this->stageIds['Applied']);

    DB::table('application_status_history')->insert([
        'application_id' => $application->id,
        'from_stage_id' => null,
        'to_stage_id' => $this->stageIds['Applied'],
        'from_status' => null,
        'to_status' => 'applied',
        'changed_by' => $this->hr->id,
        'created_at' => now(),
    ]);

    migration()->up();

    expect(DB::table('application_status_history')->where('application_id', $application->id)->value('from_stage_id'))
        ->toBeNull();
});

test('a job created after the old pipeline was deleted still gets default stages', function () {
    DB::table('pipeline_stages')->where('pipeline_id', $this->pipelineId)->delete();
    DB::table('pipelines')->where('id', $this->pipelineId)->delete();

    $job = Job::factory()->for($this->acme)->create();

    migration()->up();

    $names = DB::table('pipeline_stages')
        ->join('pipelines', 'pipelines.id', '=', 'pipeline_stages.pipeline_id')
        ->where('pipelines.job_id', $job->id)
        ->orderBy('pipeline_stages.order')
        ->pluck('pipeline_stages.name');

    expect($names->all())->toBe(['Applied', 'In Review', 'Interview', 'Offer', 'Hired', 'Rejected']);
});

test('the orphaned organization pipeline is cleared out', function () {
    Job::factory()->for($this->acme)->create();

    migration()->up();

    expect(DB::table('pipelines')->where('id', $this->pipelineId)->exists())->toBeFalse();
    expect(DB::table('pipeline_stages')->where('pipeline_id', $this->pipelineId)->exists())->toBeFalse();
});

test('a job can only hold one pipeline', function () {
    Job::factory()->for($this->acme)->create();

    migration()->up();

    expect(Schema::hasColumn('pipelines', 'job_id'))->toBeTrue();

    $duplicate = fn () => DB::table('pipelines')->insert([
        'job_id' => DB::table('pipelines')->value('job_id'),
        'organization_id' => $this->acme->id,
        'name' => 'Second',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect($duplicate)->toThrow(UniqueConstraintViolationException::class);
});
