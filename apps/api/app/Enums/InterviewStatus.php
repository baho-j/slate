<?php

namespace App\Enums;

enum InterviewStatus: string
{
    case Scheduled = 'scheduled';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';

    public function isOpen(): bool
    {
        return $this === self::Scheduled;
    }
}
