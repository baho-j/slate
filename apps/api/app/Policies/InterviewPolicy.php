<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Interview;
use App\Models\User;

class InterviewPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isSuperAdmin() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $this->isRecruiterPlus($user);
    }

    public function create(User $user, Application $application): bool
    {
        return $this->isRecruiterPlus($user)
            && $user->organization_id === $application->organization_id;
    }

    public function update(User $user, Interview $interview): bool
    {
        return $this->isRecruiterPlus($user)
            && $user->organization_id === $interview->organization_id;
    }

    public function view(User $user, Interview $interview): bool
    {
        if ($user->organization_id !== $interview->organization_id) {
            return false;
        }

        return $this->isRecruiterPlus($user) || $interview->interviewer_id === $user->id;
    }

    private function isRecruiterPlus(User $user): bool
    {
        return $user->hasRole(UserRole::HrManager, UserRole::Recruiter);
    }
}
