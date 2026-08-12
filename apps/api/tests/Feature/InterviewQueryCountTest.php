<?php

use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Interview;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function countInterviewQueries(callable $callback): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();

    $callback();

    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

function assignInterviews(User $interviewer, Organization $organization, int $count): void
{
    for ($i = 0; $i < $count; $i++) {
        $application = Application::factory()
            ->for(Job::factory()->for($organization))
            ->for(Candidate::factory())
            ->create();

        Interview::factory()->for($application)->create(['interviewer_id' => $interviewer->id]);
    }
}

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->interviewer = User::factory()->for($this->organization)->role(UserRole::Interviewer)->create();
});

test('my interviews costs the same whatever the row count', function () {
    assignInterviews($this->interviewer, $this->organization, 2);

    $this->actingAs($this->interviewer);
    $url = '/api/interviews/mine?per_page=50';
    $this->getJson($url)->assertOk();

    $forTwo = countInterviewQueries(fn () => $this->getJson($url)->assertOk());

    assignInterviews($this->interviewer, $this->organization, 18);

    $forTwenty = countInterviewQueries(fn () => $this->getJson($url)
        ->assertOk()
        ->assertJsonCount(20, 'data'));

    expect($forTwenty)->toBe($forTwo);
});

test('the mine query has a composite index covering its filter and sort', function () {
    $index = collect(DB::select(
        "SELECT indexdef FROM pg_indexes WHERE tablename = 'interviews' AND indexname = ?",
        ['interviews_interviewer_id_scheduled_at_index']
    ))->pluck('indexdef')->first();

    expect($index)->toContain('interviewer_id')->toContain('scheduled_at');
})->skip(fn () => DB::connection()->getDriverName() !== 'pgsql', 'Postgres only.');

test('the application detail carries its interviews without extra queries', function () {
    $recruiter = User::factory()->for($this->organization)->role(UserRole::Recruiter)->create();
    $application = Application::factory()
        ->for(Job::factory()->for($this->organization))
        ->for(Candidate::factory())
        ->create();

    Interview::factory()->for($application)->create(['interviewer_id' => $this->interviewer->id]);

    $this->actingAs($recruiter);
    $url = "/api/applications/{$application->id}";
    $this->getJson($url)->assertOk();

    $forOne = countInterviewQueries(fn () => $this->getJson($url)->assertOk());

    Interview::factory()->for($application)->count(4)->create([
        'interviewer_id' => User::factory()->for($this->organization)->role(UserRole::Interviewer)->create()->id,
    ]);

    $forFive = countInterviewQueries(fn () => $this->getJson($url)
        ->assertOk()
        ->assertJsonCount(5, 'data.interviews'));

    expect($forFive)->toBe($forOne);
});
