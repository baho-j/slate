<?php

namespace App\Policies;

use App\Models\Job;
use App\Models\User;

class PipelinePolicy
{
    public function configure(User $user, Job $job): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isHrManager() && $user->organization_id === $job->organization_id;
    }
}
