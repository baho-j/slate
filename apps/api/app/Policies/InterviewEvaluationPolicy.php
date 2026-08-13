<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Interview;
use App\Models\User;

class InterviewEvaluationPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isSuperAdmin() ? true : null;
    }

    public function create(User $user, Interview $interview): bool
    {
        return $user->organization_id === $interview->organization_id
            && $interview->interviewer_id === $user->id;
    }

    public function view(User $user, Interview $interview): bool
    {
        return $user->organization_id === $interview->organization_id
            && $user->hasRole(UserRole::HrManager, UserRole::Recruiter);
    }
}
