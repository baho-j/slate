<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationReceived extends Notification implements ShouldQueue
{
    use Queueable;

    private string $candidateName;

    private string $jobTitle;

    public function __construct(Application $application)
    {
        $this->candidateName = $application->candidate->full_name;
        $this->jobTitle = $application->job->title;
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
        return (new MailMessage)
            ->subject("We've received your application for {$this->jobTitle}")
            ->greeting("Hi {$this->candidateName},")
            ->line("Thanks for applying for the {$this->jobTitle} role. Your application is in and the hiring team will be in touch as it progresses.")
            ->line('You can reply to this email if you need to reach us.')
            ->salutation('— The hiring team');
    }
}
