<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case HrManager = 'hr_manager';
    case Recruiter = 'recruiter';
    case Interviewer = 'interviewer';
    case Candidate = 'candidate';

    public function isStaff(): bool
    {
        return in_array($this, [self::HrManager, self::Recruiter, self::Interviewer], true);
    }
}
