<?php

namespace App\Enums;

use App\Models\PipelineStage;

enum StageOutcome
{
    case Rejection;
    case Decision;
    case Progression;

    public static function forStage(PipelineStage $stage): self
    {
        if (! $stage->is_terminal) {
            return self::Progression;
        }

        return preg_match('/reject|declin|unsuccess/i', $stage->name) === 1
            ? self::Rejection
            : self::Decision;
    }
}
