<?php

use App\Enums\InterviewStatus;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Interview;
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
});

function scheduleFor(Application $application, User $interviewer, array $overrides = []): array
{
    return array_merge([
        'interviewer_id' => $interviewer->id,
        'scheduled_at' => now()->addWeek()->toIso8601String(),
        'location' => 'Google Meet',
    ], $overrides);
}

describe('scheduling', function () {
    test('a recruiter schedules an interview', function () {
        $this->actingAs($this->recruiter)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $this->interviewer, ['notes' => 'Focus on system design.'])
            )
            ->assertCreated()
            ->assertJsonPath('data.location', 'Google Meet')
            ->assertJsonPath('data.status', 'scheduled')
            ->assertJsonPath('data.notes', 'Focus on system design.')
            ->assertJsonPath('data.interviewer.id', $this->interviewer->id);

        expect($this->application->interviews()->count())->toBe(1);
    });

    test('the interview records who scheduled it and inherits the org', function () {
        $this->actingAs($this->recruiter)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $this->interviewer)
            )
            ->assertCreated();

        $interview = Interview::withoutGlobalScopes()->firstOrFail();

        expect($interview->created_by)->toBe($this->recruiter->id)
            ->and($interview->organization_id)->toBe($this->acme->id);
    });

    test('an hr manager can schedule too', function () {
        $manager = User::factory()->for($this->acme)->role(UserRole::HrManager)->create();

        $this->actingAs($manager)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $this->interviewer)
            )
            ->assertCreated();
    });

    test('an application can hold several interviews', function () {
        $second = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

        $this->actingAs($this->recruiter);

        $this->postJson(
            "/api/applications/{$this->application->id}/interviews",
            scheduleFor($this->application, $this->interviewer)
        )->assertCreated();

        $this->postJson(
            "/api/applications/{$this->application->id}/interviews",
            scheduleFor($this->application, $second, ['scheduled_at' => now()->addWeeks(2)->toIso8601String()])
        )->assertCreated();

        expect($this->application->interviews()->count())->toBe(2);
    });
});

describe('scheduling validation', function () {
    test('the scheduled time must be in the future', function () {
        $this->actingAs($this->recruiter)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $this->interviewer, [
                    'scheduled_at' => now()->subDay()->toIso8601String(),
                ])
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('scheduled_at');
    });

    test('the interviewer is required', function () {
        $this->actingAs($this->recruiter)
            ->postJson("/api/applications/{$this->application->id}/interviews", [
                'scheduled_at' => now()->addWeek()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('interviewer_id');
    });

    test('the interviewer must belong to the same organization', function () {
        $outsider = User::factory()->for($this->globex)->role(UserRole::Interviewer)->create();

        $this->actingAs($this->recruiter)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $outsider)
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('interviewer_id');
    });

    test('a candidate cannot be assigned as an interviewer', function () {
        $candidate = User::factory()->for($this->acme)->role(UserRole::Candidate)->create();

        $this->actingAs($this->recruiter)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $candidate)
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('interviewer_id');
    });

    test('notes are length limited', function () {
        $this->actingAs($this->recruiter)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $this->interviewer, ['notes' => str_repeat('a', 2001)])
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('notes');
    });
});

describe('scheduling authorization', function () {
    test('scheduling requires authentication', function () {
        $this->postJson("/api/applications/{$this->application->id}/interviews", [])
            ->assertUnauthorized();
    });

    test('an interviewer cannot schedule an interview', function () {
        $this->actingAs($this->interviewer)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $this->interviewer)
            )
            ->assertForbidden();
    });

    test('a recruiter from another org gets 404 for the application', function () {
        $outsider = User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

        $this->actingAs($outsider)
            ->postJson(
                "/api/applications/{$this->application->id}/interviews",
                scheduleFor($this->application, $this->interviewer)
            )
            ->assertNotFound();
    });
});

describe('rescheduling', function () {
    beforeEach(function () {
        $this->interview = Interview::factory()
            ->for($this->application)
            ->create(['interviewer_id' => $this->interviewer->id]);
    });

    test('a recruiter reschedules an interview', function () {
        $when = now()->addWeeks(3)->startOfMinute();

        $this->actingAs($this->recruiter)
            ->patchJson("/api/interviews/{$this->interview->id}", [
                'scheduled_at' => $when->toIso8601String(),
                'location' => 'Helsinki office',
            ])
            ->assertOk()
            ->assertJsonPath('data.location', 'Helsinki office');

        expect($this->interview->fresh()->scheduled_at->startOfMinute()->eq($when))->toBeTrue();
    });

    test('a recruiter cancels an interview', function () {
        $this->actingAs($this->recruiter)
            ->patchJson("/api/interviews/{$this->interview->id}", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    });

    test('a past interview can be marked completed without resupplying a future time', function () {
        $past = Interview::factory()->for($this->application)->past()->create([
            'interviewer_id' => $this->interviewer->id,
        ]);

        $this->actingAs($this->recruiter)
            ->patchJson("/api/interviews/{$past->id}", ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');
    });

    test('rescheduling into the past is rejected', function () {
        $this->actingAs($this->recruiter)
            ->patchJson("/api/interviews/{$this->interview->id}", [
                'scheduled_at' => now()->subDay()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('scheduled_at');
    });

    test('an unknown status is rejected', function () {
        $this->actingAs($this->recruiter)
            ->patchJson("/api/interviews/{$this->interview->id}", ['status' => 'postponed'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    });

    test('the interviewer can be reassigned', function () {
        $replacement = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();

        $this->actingAs($this->recruiter)
            ->patchJson("/api/interviews/{$this->interview->id}", [
                'interviewer_id' => $replacement->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.interviewer.id', $replacement->id);
    });

    test('the assigned interviewer cannot reschedule themselves', function () {
        $this->actingAs($this->interviewer)
            ->patchJson("/api/interviews/{$this->interview->id}", ['status' => 'cancelled'])
            ->assertForbidden();
    });

    test('a recruiter from another org gets 404 for the interview', function () {
        $outsider = User::factory()->for($this->globex)->role(UserRole::Recruiter)->create();

        $this->actingAs($outsider)
            ->patchJson("/api/interviews/{$this->interview->id}", ['status' => 'cancelled'])
            ->assertNotFound();
    });
});

describe('assignable interviewers', function () {
    test('a recruiter lists the staff who can be assigned', function () {
        $candidate = User::factory()->for($this->acme)->role(UserRole::Candidate)->create();
        $outsider = User::factory()->for($this->globex)->role(UserRole::Interviewer)->create();

        $response = $this->actingAs($this->recruiter)
            ->getJson('/api/interviewers')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');

        expect($ids)->toContain($this->interviewer->id, $this->recruiter->id)
            ->not->toContain($candidate->id)
            ->not->toContain($outsider->id);
    });

    test('an interviewer cannot enumerate staff', function () {
        $this->actingAs($this->interviewer)
            ->getJson('/api/interviewers')
            ->assertForbidden();
    });

    test('listing interviewers requires authentication', function () {
        $this->getJson('/api/interviewers')->assertUnauthorized();
    });
});

describe('my interviews', function () {
    test('an interviewer sees only the interviews assigned to them', function () {
        $mine = Interview::factory()->for($this->application)->create([
            'interviewer_id' => $this->interviewer->id,
        ]);

        $colleague = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();
        Interview::factory()->for($this->application)->create(['interviewer_id' => $colleague->id]);

        $this->actingAs($this->interviewer)
            ->getJson('/api/interviews/mine')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);
    });

    test('interviews from another org never appear', function () {
        $otherApplication = Application::factory()
            ->for(Job::factory()->for($this->globex))
            ->for(Candidate::factory())
            ->create();

        Interview::factory()->for($otherApplication)->create([
            'interviewer_id' => User::factory()->for($this->globex)->role(UserRole::Interviewer)->create()->id,
        ]);

        Interview::factory()->for($this->application)->create([
            'interviewer_id' => $this->interviewer->id,
        ]);

        $this->actingAs($this->interviewer)
            ->getJson('/api/interviews/mine')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    });

    test('the list carries the candidate and job for each interview', function () {
        Interview::factory()->for($this->application)->create([
            'interviewer_id' => $this->interviewer->id,
        ]);

        $this->actingAs($this->interviewer)
            ->getJson('/api/interviews/mine')
            ->assertOk()
            ->assertJsonPath('data.0.application.candidate.full_name', $this->application->candidate->full_name)
            ->assertJsonPath('data.0.application.job.title', $this->job->title);
    });

    test('the list is ordered by the soonest interview first', function () {
        $later = Interview::factory()->for($this->application)->create([
            'interviewer_id' => $this->interviewer->id,
            'scheduled_at' => now()->addWeeks(3),
        ]);
        $sooner = Interview::factory()->for($this->application)->create([
            'interviewer_id' => $this->interviewer->id,
            'scheduled_at' => now()->addDay(),
        ]);

        $this->actingAs($this->interviewer)
            ->getJson('/api/interviews/mine')
            ->assertOk()
            ->assertJsonPath('data.0.id', $sooner->id)
            ->assertJsonPath('data.1.id', $later->id);
    });

    test('the list can be filtered by status', function () {
        Interview::factory()->for($this->application)->create([
            'interviewer_id' => $this->interviewer->id,
        ]);
        Interview::factory()->for($this->application)->status(InterviewStatus::Cancelled)->create([
            'interviewer_id' => $this->interviewer->id,
        ]);

        $this->actingAs($this->interviewer)
            ->getJson('/api/interviews/mine?status=scheduled')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'scheduled');
    });

    test('the list is paginated', function () {
        Interview::factory()->for($this->application)->count(3)->create([
            'interviewer_id' => $this->interviewer->id,
        ]);

        $this->actingAs($this->interviewer)
            ->getJson('/api/interviews/mine?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.last_page', 2);
    });

    test('mine requires authentication', function () {
        $this->getJson('/api/interviews/mine')->assertUnauthorized();
    });

    test('a recruiter with no assignments sees an empty list', function () {
        Interview::factory()->for($this->application)->create([
            'interviewer_id' => $this->interviewer->id,
        ]);

        $this->actingAs($this->recruiter)
            ->getJson('/api/interviews/mine')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    });
});
