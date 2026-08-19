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

    /**
     * Roles an hr_manager may assign. `super_admin` is deliberately excluded — an
     * hr_manager must never be able to mint or escalate to a super admin.
     *
     * @return array<int, self>
     */
    public static function assignable(): array
    {
        return [self::HrManager, self::Recruiter, self::Interviewer, self::Candidate];
    }
}
