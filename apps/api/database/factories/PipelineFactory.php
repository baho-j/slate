<?php

namespace Database\Factories;

use App\Models\Job;
use App\Models\Pipeline;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Pipeline>
 */
class PipelineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_id' => Job::factory(),
            'name' => 'Default',
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Pipeline $pipeline) {
            if ($pipeline->organization_id === null) {
                $pipeline->organization_id = Job::withoutGlobalScopes()
                    ->whereKey($pipeline->job_id)
                    ->value('organization_id');
            }
        });
    }
}
