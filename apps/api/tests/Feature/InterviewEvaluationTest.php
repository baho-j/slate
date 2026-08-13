<?php

use App\Enums\InterviewStatus;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Interview;
use App\Models\InterviewEvaluation;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->globex = Organization::factory()->create(['slug' => 'globex']);

    $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
    $this->interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

    $this->job = Job::factory()->for($this->acme)->published()->create();
    $this->application = Application::factory()
        ->for($this->job)
        ->for(Candidate::factory())
        ->create();

    $this->interview = Interview::factory()
        ->for($this->application)
        ->create(['interviewer_id' => $this->interviewer->id]);
});

function evaluation(array $overrides = []): array
{
    return array_merge([
        'rating' => 4,
        'recommendation' => 'yes',
        'comments' => 'Strong on fundamentals, some gaps in system design.',
    ], $overrides);
}

describe('submitting an evaluation', function () {
    test('the assigned interviewer submits an evaluation', function () {
        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertCreated()
            ->assertJsonPath('data.rating', 4)
            ->assertJsonPath('data.recommendation', 'yes')
            ->assertJsonPath('data.author.id', $this->interviewer->id);

        expect($this->interview->evaluation()->count())->toBe(1);
    });

    test('submitting records the author and inherits the org', function () {
        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertCreated();

        $stored = InterviewEvaluation::withoutGlobalScopes()->firstOrFail();

        expect($stored->created_by)->toBe($this->interviewer->id)
            ->and($stored->organization_id)->toBe($this->acme->id);
    });

    test('submitting an evaluation completes the interview', function () {
        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertCreated();

        expect($this->interview->fresh()->status)->toBe(InterviewStatus::Completed);
    });

    test('comments are optional', function () {
        $this->actingAs($this->interviewer)
            ->postJson(
                "/api/interviews/{$this->interview->id}/evaluation",
                evaluation(['comments' => null])
            )
            ->assertCreated()
            ->assertJsonPath('data.comments', null);
    });
});

describe('evaluation authorization', function () {
    test('an interviewer not assigned to this interview is forbidden', function () {
        $other = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

        $this->actingAs($other)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertForbidden();

        expect($this->interview->evaluation()->exists())->toBeFalse();
    });

    test('a recruiter cannot submit an evaluation', function () {
        $this->actingAs($this->recruiter)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertForbidden();
    });

    test('submitting requires authentication', function () {
        $this->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertUnauthorized();
    });

    test('an interviewer from another org gets 404 for the interview', function () {
        $outsider = User::factory()->for($this->globex)->role(UserRole::Interviewer)->create();

        $this->actingAs($outsider)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertNotFound();
    });
});

describe('evaluation state rules', function () {
    test('a cancelled interview cannot be evaluated', function () {
        $this->interview->update(['status' => InterviewStatus::Cancelled]);

        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        expect($this->interview->evaluation()->exists())->toBeFalse();
    });

    test('an interview cannot be evaluated twice', function () {
        InterviewEvaluation::factory()->for($this->interview)->create();

        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rating');

        expect($this->interview->evaluation()->count())->toBe(1);
    });
});

describe('evaluation validation', function () {
    test('the rating is required', function () {
        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation(['rating' => null]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rating');
    });

    test('the rating cannot exceed five', function () {
        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation(['rating' => 6]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rating');
    });

    test('the rating cannot be below one', function () {
        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation(['rating' => 0]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rating');
    });

    test('the recommendation must be a known value', function () {
        $this->actingAs($this->interviewer)
            ->postJson("/api/interviews/{$this->interview->id}/evaluation", evaluation(['recommendation' => 'maybe']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('recommendation');
    });

    test('comments are length limited', function () {
        $this->actingAs($this->interviewer)
            ->postJson(
                "/api/interviews/{$this->interview->id}/evaluation",
                evaluation(['comments' => str_repeat('a', 2001)])
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('comments');
    });
});

describe('evaluation visibility', function () {
    beforeEach(function () {
        InterviewEvaluation::factory()->for($this->interview)->create([
            'rating' => 5,
            'recommendation' => 'strong_yes',
            'created_by' => $this->interviewer->id,
        ]);
    });

    test('a recruiter sees the evaluation on the application detail', function () {
        $this->actingAs($this->recruiter)
            ->getJson("/api/applications/{$this->application->id}")
            ->assertOk()
            ->assertJsonPath('data.interviews.0.evaluation.rating', 5)
            ->assertJsonPath('data.interviews.0.evaluation.recommendation', 'strong_yes')
            ->assertJsonPath('data.interviews.0.evaluation.author.name', $this->interviewer->name);
    });

    test('an assigned interviewer does not see evaluations on the application detail', function () {
        $this->actingAs($this->interviewer)
            ->getJson("/api/applications/{$this->application->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.interviews.0.evaluation');
    });
});
