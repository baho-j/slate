<?php

namespace App\Actions;

use App\Models\Job;
use App\Models\Pipeline;

class EnsureDefaultPipeline
{
    public const STAGES = [
        ['name' => 'Applied', 'order' => 1, 'is_terminal' => false],
        ['name' => 'In Review', 'order' => 2, 'is_terminal' => false],
        ['name' => 'Interview', 'order' => 3, 'is_terminal' => false],
        ['name' => 'Offer', 'order' => 4, 'is_terminal' => false],
        ['name' => 'Hired', 'order' => 5, 'is_terminal' => true],
        ['name' => 'Rejected', 'order' => 6, 'is_terminal' => true],
    ];

    public function forJob(Job $job): Pipeline
    {
        $pipeline = Pipeline::withoutGlobalScopes()
            ->where('job_id', $job->id)
            ->first();

        if ($pipeline === null) {
            $pipeline = new Pipeline(['name' => 'Default']);
            $pipeline->job_id = $job->id;
            $pipeline->organization_id = $job->organization_id;
            $pipeline->save();
        }

        if ($pipeline->stages()->count() === 0) {
            $pipeline->stages()->createMany(self::STAGES);
        }

        return $pipeline;
    }
}
