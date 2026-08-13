<?php

namespace App\Notifications;

use App\Models\Interview;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InterviewScheduled extends Notification implements ShouldQueue
{
    use Queueable;

    private string $candidateName;

    private string $interviewerName;

    private string $jobTitle;

    private ?string $location;

    private string $when;

    public function __construct(Interview $interview, private readonly bool $forInterviewer)
    {
        $this->candidateName = $interview->application->candidate->full_name;
        $this->interviewerName = $interview->interviewer->name;
        $this->jobTitle = $interview->application->job->title;
        $this->location = $interview->location;
        $this->when = $interview->scheduled_at->format('l j F Y, H:i');
    }

    public static function forCandidate(Interview $interview): self
    {
        return new self($interview, false);
    }

    public static function forInterviewer(Interview $interview): self
    {
        return new self($interview, true);
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->forInterviewer
            ? $this->interviewerMail()
            : $this->candidateMail();
    }

    private function candidateMail(): MailMessage
    {
        $message = (new MailMessage)
            ->subject("Your interview for {$this->jobTitle} is scheduled")
            ->greeting("Hi {$this->candidateName},")
            ->line("You have an interview scheduled for the {$this->jobTitle} role.")
            ->line("When: {$this->when}");

        if ($this->location) {
            $message->line("Where: {$this->location}");
        }

        return $message
            ->line('If you need to reschedule, just reply to this email.')
            ->salutation('— The hiring team');
    }

    private function interviewerMail(): MailMessage
    {
        $message = (new MailMessage)
            ->subject("Interview assigned: {$this->candidateName} for {$this->jobTitle}")
            ->greeting("Hi {$this->interviewerName},")
            ->line("You've been assigned to interview {$this->candidateName} for the {$this->jobTitle} role.")
            ->line("When: {$this->when}");

        if ($this->location) {
            $message->line("Where: {$this->location}");
        }

        return $message
            ->line('You can open the application and submit your evaluation once the interview is done.')
            ->salutation('— Slate');
    }
}
