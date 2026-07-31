<?php

namespace App\Actions;

use App\Models\Organization;
use App\Models\Pipeline;

class EnsureDefaultPipeline
{
    private const STAGES = [
        ['name' => 'Applied', 'order' => 1, 'is_terminal' => false],
        ['name' => 'In Review', 'order' => 2, 'is_terminal' => false],
        ['name' => 'Interview', 'order' => 3, 'is_terminal' => false],
        ['name' => 'Offer', 'order' => 4, 'is_terminal' => false],
        ['name' => 'Hired', 'order' => 5, 'is_terminal' => true],
        ['name' => 'Rejected', 'order' => 6, 'is_terminal' => true],
    ];

    public function forOrganization(Organization $organization): Pipeline
    {
        $pipeline = Pipeline::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->first();

        if ($pipeline === null) {
            $pipeline = new Pipeline(['name' => 'Default']);
            $pipeline->organization_id = $organization->id;
            $pipeline->save();
        }

        if ($pipeline->stages()->count() === 0) {
            $pipeline->stages()->createMany(self::STAGES);
        }

        return $pipeline;
    }
}
