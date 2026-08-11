<?php

use App\Actions\EnsureDefaultPipeline;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function queriesFor(callable $callback): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();

    $callback();

    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

function fillStage(Job $job, int $stageId, int $count): void
{
    Application::factory()
        ->for($job)
        ->count($count)
        ->sequence(fn () => ['candidate_id' => Candidate::factory()])
        ->create(['current_stage_id' => $stageId]);
}

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->recruiter = User::factory()->for($this->organization)->role(UserRole::Recruiter)->create();
    $this->job = Job::factory()->for($this->organization)->create();
    $this->stage = app(EnsureDefaultPipeline::class)->forJob($this->job)->stages()->first();
});

test('a board column costs the same whatever the card count', function () {
    fillStage($this->job, $this->stage->id, 2);

    $this->actingAs($this->recruiter);
    $url = "/api/jobs/{$this->job->id}/applications?stage={$this->stage->id}&per_page=50";
    $this->getJson($url)->assertOk();

    $forTwo = queriesFor(fn () => $this->getJson($url)->assertOk());

    fillStage($this->job, $this->stage->id, 20);

    $forTwentyTwo = queriesFor(fn () => $this->getJson($url)
        ->assertOk()
        ->assertJsonCount(22, 'data'));

    expect($forTwentyTwo)->toBe($forTwo);
});

test('a column card carries the candidate and stage without extra queries', function () {
    fillStage($this->job, $this->stage->id, 5);

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/applications?stage={$this->stage->id}")
        ->assertOk()
        ->assertJsonPath('data.0.current_stage.name', $this->stage->name)
        ->assertJsonPath('data.0.candidate.full_name', fn (string $name) => $name !== '');
});

test('a column only returns the applications sitting in that stage', function () {
    $stages = app(EnsureDefaultPipeline::class)->forJob($this->job)->stages()->get();

    fillStage($this->job, $stages->get(0)->id, 3);
    fillStage($this->job, $stages->get(1)->id, 2);

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/applications?stage={$stages->get(1)->id}")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2);
});

test('a column paginates independently of the other columns', function () {
    fillStage($this->job, $this->stage->id, 25);

    $this->actingAs($this->recruiter)
        ->getJson("/api/jobs/{$this->job->id}/applications?stage={$this->stage->id}&per_page=10&page=3")
        ->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.current_page', 3)
        ->assertJsonPath('meta.last_page', 3);
});
