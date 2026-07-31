<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Job;
use App\Models\User;

class ApplicationPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isSuperAdmin() ? true : null;
    }

    public function viewAnyForJob(User $user, Job $job): bool
    {
        return $this->isRecruiterPlus($user) && $user->organization_id === $job->organization_id;
    }

    public function view(User $user, Application $application): bool
    {
        if ($user->isCandidate()) {
            return $application->candidate?->user_id === $user->id;
        }

        return $this->isRecruiterPlus($user) && $user->organization_id === $application->organization_id;
    }

    private function isRecruiterPlus(User $user): bool
    {
        return $user->hasRole(UserRole::HrManager, UserRole::Recruiter);
    }
}
