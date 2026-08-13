<?php

use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Interview;
use App\Models\Job;
use App\Models\Organization;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Notifications\ApplicationReceived;
use App\Notifications\ApplicationStageChanged;
use App\Notifications\InterviewScheduled;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('cv');
    Notification::fake();

    $this->acme = Organization::factory()->create(['slug' => 'acme']);
    $this->job = Job::factory()->for($this->acme)->published()->create();
});

function cvKey(string $key = 'cv/valid.pdf'): string
{
    Storage::disk('cv')->put($key, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

    return $key;
}

describe('applied', function () {
    test('applying queues a confirmation to the candidate', function () {
        $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", [
            'full_name' => 'Cora Candidate',
            'email' => 'cora@example.com',
            'cover_note' => 'Hello.',
            'cv_key' => cvKey(),
            'cv_original_name' => 'cora.pdf',
        ])->assertCreated();

        Notification::assertSentTo(
            new AnonymousNotifiable,
            ApplicationReceived::class,
            function ($notification, $channels, $notifiable) {
                return $notifiable->routes['mail'] === 'cora@example.com';
            }
        );
    });

    test('the confirmation is queued, never sent synchronously', function () {
        $this->postJson("/api/public/o/acme/jobs/{$this->job->id}/apply", [
            'full_name' => 'Cora Candidate',
            'email' => 'cora@example.com',
            'cv_key' => cvKey(),
            'cv_original_name' => 'cora.pdf',
        ])->assertCreated();

        expect(is_subclass_of(ApplicationReceived::class, ShouldQueue::class))->toBeTrue();
    });
});

describe('stage change', function () {
    beforeEach(function () {
        $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
        $this->candidate = Candidate::factory()->create(['email' => 'mover@example.com']);
        $this->application = Application::factory()->for($this->job)->for($this->candidate)->create();

        $pipeline = Pipeline::factory()->for($this->job)->create(['organization_id' => $this->acme->id]);
        $this->progression = PipelineStage::factory()->for($pipeline)->create(['name' => 'In Review', 'is_terminal' => false]);
        $this->rejection = PipelineStage::factory()->for($pipeline)->create(['name' => 'Rejected', 'is_terminal' => true]);

        $this->move = fn (PipelineStage $stage) => $this->actingAs($this->recruiter)
            ->patchJson("/api/applications/{$this->application->id}/stage", ['stage_id' => $stage->id])
            ->assertOk();
    });

    test('moving to a stage queues a notification to the candidate', function () {
        ($this->move)($this->progression);

        Notification::assertSentTo(
            new AnonymousNotifiable,
            ApplicationStageChanged::class,
            fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === 'mover@example.com'
        );
    });

    test('the stage-change notification is queued', function () {
        expect(is_subclass_of(ApplicationStageChanged::class, ShouldQueue::class))->toBeTrue();
    });

    test('a progression uses different copy from a rejection', function () {
        ($this->move)($this->progression);

        Notification::assertSentTo(new AnonymousNotifiable, ApplicationStageChanged::class, function ($notification) {
            $mail = $notification->toMail(new AnonymousNotifiable);

            return str_contains($mail->subject, 'moved forward');
        });
    });

    test('moving to a terminal rejection stage uses the rejection copy', function () {
        ($this->move)($this->rejection);

        Notification::assertSentTo(new AnonymousNotifiable, ApplicationStageChanged::class, function ($notification) {
            $mail = $notification->toMail(new AnonymousNotifiable);
            $body = implode(' ', $mail->introLines);

            return str_contains($mail->subject, 'An update on your application')
                && str_contains($body, 'not to move forward');
        });
    });
});

describe('interview scheduled', function () {
    beforeEach(function () {
        $this->recruiter = User::factory()->for($this->acme)->role(UserRole::Recruiter)->create();
        $this->interviewer = User::factory()->for($this->acme)->role(UserRole::Interviewer)->create();
        $this->candidate = Candidate::factory()->create(['email' => 'interviewee@example.com']);
        $this->application = Application::factory()->for($this->job)->for($this->candidate)->create();
    });

    test('scheduling notifies both the candidate and the assigned interviewer', function () {
        $this->actingAs($this->recruiter)
            ->postJson("/api/applications/{$this->application->id}/interviews", [
                'interviewer_id' => $this->interviewer->id,
                'scheduled_at' => now()->addWeek()->toIso8601String(),
                'location' => 'Google Meet',
            ])->assertCreated();

        Notification::assertSentTo(
            new AnonymousNotifiable,
            InterviewScheduled::class,
            fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === 'interviewee@example.com'
        );

        Notification::assertSentTo($this->interviewer, InterviewScheduled::class);
    });

    test('the candidate and interviewer get differently-worded mail', function () {
        $this->actingAs($this->recruiter);

        $interview = Interview::factory()->for($this->application)->create([
            'interviewer_id' => $this->interviewer->id,
        ]);

        $candidateMail = InterviewScheduled::forCandidate($interview->load('application.candidate', 'application.job', 'interviewer'))
            ->toMail(new AnonymousNotifiable);
        $interviewerMail = InterviewScheduled::forInterviewer($interview->load('application.candidate', 'application.job', 'interviewer'))
            ->toMail($this->interviewer);

        expect($candidateMail->subject)->toContain('Your interview for')
            ->and($interviewerMail->subject)->toContain('Interview assigned');
    });

    test('the interview notification is queued', function () {
        expect(is_subclass_of(InterviewScheduled::class, ShouldQueue::class))->toBeTrue();
    });
});
