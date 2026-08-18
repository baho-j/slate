<?php

use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use App\Models\TalentPoolEntry;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);

    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
    $this->job = Job::factory()->for($this->acme)->published()->create();
});

/** A candidate who has applied to the given org, so they're eligible for its pool. */
function applicantFor(Job $job, array $candidate = []): Candidate
{
    $model = Candidate::factory()->create($candidate);
    Application::factory()->for($job)->for($model)->create();

    return $model;
}

function countPoolQueries(callable $callback): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();
    $callback();
    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

describe('adding to the pool', function () {
    test('a recruiter pools a candidate with tags and a note', function () {
        $candidate = applicantFor($this->job);

        $this->actingAs($this->recruiter)
            ->postJson('/api/talent-pool', [
                'candidate_id' => $candidate->id,
                'tags' => ['senior', 'backend'],
                'note' => 'Strong system design.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.candidate.id', $candidate->id)
            ->assertJsonPath('data.tags', ['senior', 'backend'])
            ->assertJsonPath('data.note', 'Strong system design.');

        $this->assertDatabaseHas('talent_pool_entries', [
            'candidate_id' => $candidate->id,
            'organization_id' => $this->acme->id,
            'added_by' => $this->recruiter->id,
        ]);
    });

    test('re-adding the same candidate updates tags instead of duplicating', function () {
        $candidate = applicantFor($this->job);

        $this->actingAs($this->recruiter)
            ->postJson('/api/talent-pool', ['candidate_id' => $candidate->id, 'tags' => ['backend']])
            ->assertCreated();

        $this->actingAs($this->recruiter)
            ->postJson('/api/talent-pool', ['candidate_id' => $candidate->id, 'tags' => ['frontend', 'design']])
            ->assertOk()
            ->assertJsonPath('data.tags', ['frontend', 'design']);

        expect(TalentPoolEntry::withoutGlobalScopes()->where('candidate_id', $candidate->id)->count())->toBe(1);
    });

    test('the same candidate can sit in two different orgs pools', function () {
        $globexJob = Job::factory()->for($this->globex)->published()->create();
        $globexRecruiter = User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

        $candidate = Candidate::factory()->create();
        Application::factory()->for($this->job)->for($candidate)->create();
        Application::factory()->for($globexJob)->for($candidate)->create();

        $this->actingAs($this->recruiter)
            ->postJson('/api/talent-pool', ['candidate_id' => $candidate->id])
            ->assertCreated();

        $this->actingAs($globexRecruiter)
            ->postJson('/api/talent-pool', ['candidate_id' => $candidate->id])
            ->assertCreated();

        expect(TalentPoolEntry::withoutGlobalScopes()->where('candidate_id', $candidate->id)->count())->toBe(2);
    });
});

describe('add validation and authorization', function () {
    test('a candidate who never applied to this org cannot be pooled', function () {
        $outsider = applicantFor(Job::factory()->for($this->globex)->create());

        $this->actingAs($this->recruiter)
            ->postJson('/api/talent-pool', ['candidate_id' => $outsider->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('candidate_id');
    });

    test('the candidate id is required', function () {
        $this->actingAs($this->recruiter)
            ->postJson('/api/talent-pool', ['tags' => ['x']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('candidate_id');
    });

    test('an interviewer cannot pool candidates', function () {
        $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();
        $candidate = applicantFor($this->job);

        $this->actingAs($interviewer)
            ->postJson('/api/talent-pool', ['candidate_id' => $candidate->id])
            ->assertForbidden();
    });

    test('pooling requires authentication', function () {
        $this->postJson('/api/talent-pool', [])->assertUnauthorized();
    });
});

describe('browsing the pool', function () {
    test('a recruiter lists their org pool, newest first', function () {
        $a = applicantFor($this->job, ['full_name' => 'Ada Lovelace']);
        $b = applicantFor($this->job, ['full_name' => 'Grace Hopper']);

        TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $a->id, 'created_at' => now()->subDay()]);
        $newer = TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $b->id, 'created_at' => now()]);

        $this->actingAs($this->recruiter)
            ->getJson('/api/talent-pool')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $newer->id);
    });

    test('one org never sees another org pool', function () {
        $mine = applicantFor($this->job);
        TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $mine->id]);

        $theirs = Candidate::factory()->create();
        TalentPoolEntry::factory()->for($this->globex)->create(['candidate_id' => $theirs->id]);

        $this->actingAs($this->recruiter)
            ->getJson('/api/talent-pool')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.candidate.id', $mine->id);
    });

    test('the pool filters by tag', function () {
        $senior = applicantFor($this->job);
        $junior = applicantFor($this->job);

        TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $senior->id, 'tags' => ['senior', 'backend']]);
        TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $junior->id, 'tags' => ['junior']]);

        $this->actingAs($this->recruiter)
            ->getJson('/api/talent-pool?tag=senior')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.candidate.id', $senior->id);
    });

    test('the pool searches candidate details full-text', function () {
        $match = applicantFor($this->job, ['full_name' => 'Ada Lovelace', 'email' => 'ada@x.test']);
        $other = applicantFor($this->job, ['full_name' => 'Alan Turing', 'email' => 'alan@x.test']);

        TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $match->id]);
        TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $other->id]);

        $this->actingAs($this->recruiter)
            ->getJson('/api/talent-pool?q=lovelace')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.candidate.id', $match->id);
    });

    test('the pool is cursor paginated', function () {
        collect(range(1, 3))->each(function () {
            $c = applicantFor($this->job);
            TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $c->id]);
        });

        $this->actingAs($this->recruiter)
            ->getJson('/api/talent-pool?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data', 'meta' => ['next_cursor', 'prev_cursor']]);
    });

    test('an interviewer cannot browse the pool', function () {
        $interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

        $this->actingAs($interviewer)
            ->getJson('/api/talent-pool')
            ->assertForbidden();
    });

    test('the pool list costs the same whatever the row count', function () {
        $seed = function (int $count) {
            collect(range(1, $count))->each(function () {
                $c = applicantFor($this->job);
                TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $c->id]);
            });
        };

        $this->actingAs($this->recruiter);
        $seed(2);
        $this->getJson('/api/talent-pool?per_page=50')->assertOk();

        $forTwo = countPoolQueries(fn () => $this->getJson('/api/talent-pool?per_page=50')->assertOk());

        $seed(8);

        $forTen = countPoolQueries(
            fn () => $this->getJson('/api/talent-pool?per_page=50')->assertOk()->assertJsonCount(10, 'data')
        );

        expect($forTen)->toBe($forTwo);
    });
});

describe('removing from the pool', function () {
    test('a recruiter removes an entry', function () {
        $candidate = applicantFor($this->job);
        $entry = TalentPoolEntry::factory()->for($this->acme)->create(['candidate_id' => $candidate->id]);

        $this->actingAs($this->recruiter)
            ->deleteJson("/api/talent-pool/{$entry->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('talent_pool_entries', ['id' => $entry->id]);
    });

    test('a recruiter from another org gets 404 removing an entry', function () {
        $theirs = Candidate::factory()->create();
        $entry = TalentPoolEntry::factory()->for($this->globex)->create(['candidate_id' => $theirs->id]);

        $this->actingAs($this->recruiter)
            ->deleteJson("/api/talent-pool/{$entry->id}")
            ->assertNotFound();
    });
});

describe('surfaced on the application detail', function () {
    test('a pooled candidate shows on their application detail', function () {
        $candidate = applicantFor($this->job, ['full_name' => 'Ada Lovelace']);
        $application = Application::withoutGlobalScopes()->where('candidate_id', $candidate->id)->firstOrFail();
        TalentPoolEntry::factory()->for($this->acme)->create([
            'candidate_id' => $candidate->id,
            'tags' => ['senior'],
        ]);

        $this->actingAs($this->recruiter)
            ->getJson("/api/applications/{$application->id}")
            ->assertOk()
            ->assertJsonPath('data.talent_pool.tags', ['senior']);
    });

    test('a candidate not in the pool reports null', function () {
        $candidate = applicantFor($this->job);
        $application = Application::withoutGlobalScopes()->where('candidate_id', $candidate->id)->firstOrFail();

        $this->actingAs($this->recruiter)
            ->getJson("/api/applications/{$application->id}")
            ->assertOk()
            ->assertJsonPath('data.talent_pool', null);
    });
});
