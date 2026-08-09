<?php

namespace App\Enums;

enum CriterionMode: string
{
    case Knockout = 'knockout';
    case Scored = 'scored';

    public function isKnockout(): bool
    {
        return $this === self::Knockout;
    }

    public function isScored(): bool
    {
        return $this === self::Scored;
    }
}
