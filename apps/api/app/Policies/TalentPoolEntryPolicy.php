<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\TalentPoolEntry;
use App\Models\User;

class TalentPoolEntryPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isSuperAdmin() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $this->isRecruiterPlus($user);
    }

    public function create(User $user): bool
    {
        return $this->isRecruiterPlus($user);
    }

    public function delete(User $user, TalentPoolEntry $entry): bool
    {
        return $this->isRecruiterPlus($user)
            && $user->organization_id === $entry->organization_id;
    }

    private function isRecruiterPlus(User $user): bool
    {
        return $user->hasRole(UserRole::HrManager, UserRole::Recruiter);
    }
}
