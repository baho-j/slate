<?php

namespace App\Notifications;

use App\Enums\StageOutcome;
use App\Models\Application;
use App\Models\PipelineStage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStageChanged extends Notification implements ShouldQueue
{
    use Queueable;

    private string $candidateName;

    private string $jobTitle;

    private string $stageName;

    private StageOutcome $outcome;

    public function __construct(Application $application, PipelineStage $stage)
    {
        $this->candidateName = $application->candidate->full_name;
        $this->jobTitle = $application->job->title;
        $this->stageName = $stage->name;
        $this->outcome = StageOutcome::forStage($stage);
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
        return match ($this->outcome) {
            StageOutcome::Rejection => (new MailMessage)
                ->subject("An update on your application for {$this->jobTitle}")
                ->greeting("Hi {$this->candidateName},")
                ->line("Thank you for your interest in the {$this->jobTitle} role and for the time you invested in applying.")
                ->line('After careful consideration we have decided not to move forward with your application on this occasion. We were glad to have the chance to review it and we wish you the very best in your search.')
                ->salutation('— The hiring team'),

            StageOutcome::Decision => (new MailMessage)
                ->subject("An update on your application for {$this->jobTitle}")
                ->greeting("Hi {$this->candidateName},")
                ->line("There's an update on your application for the {$this->jobTitle} role — it has reached the \"{$this->stageName}\" stage.")
                ->line('The hiring team will follow up with any next steps.')
                ->salutation('— The hiring team'),

            StageOutcome::Progression => (new MailMessage)
                ->subject("Your application for {$this->jobTitle} has moved forward")
                ->greeting("Hi {$this->candidateName},")
                ->line("Good news — your application for the {$this->jobTitle} role has advanced to the \"{$this->stageName}\" stage.")
                ->line('We\'ll keep you posted as things progress.')
                ->salutation('— The hiring team'),
        };
    }
}
