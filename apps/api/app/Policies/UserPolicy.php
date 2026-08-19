<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isSuperAdmin() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->isHrManager();
    }

    public function create(User $user): bool
    {
        return $user->isHrManager();
    }

    public function update(User $actor, User $target): bool
    {
        return $actor->isHrManager() && $actor->organization_id === $target->organization_id;
    }

    public function delete(User $actor, User $target): bool
    {
        // The last-hr_manager guard (including self-removal) lives in the controller so it
        // returns a clear 422; the policy just gates the capability and the org boundary.
        return $actor->isHrManager() && $actor->organization_id === $target->organization_id;
    }
}
