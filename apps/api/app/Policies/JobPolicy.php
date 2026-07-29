<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Job;
use App\Models\User;

class JobPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isSuperAdmin() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->organization_id !== null;
    }

    public function view(User $user, Job $job): bool
    {
        return $user->organization_id === $job->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole(UserRole::HrManager, UserRole::Recruiter);
    }

    public function update(User $user, Job $job): bool
    {
        return $this->create($user) && $user->organization_id === $job->organization_id;
    }

    public function delete(User $user, Job $job): bool
    {
        return $this->update($user, $job);
    }
}
