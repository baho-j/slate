<?php

namespace Database\Factories;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PipelineStage>
 */
class PipelineStageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'pipeline_id' => Pipeline::factory(),
            'name' => fake()->unique()->word(),
            'order' => 1,
            'is_terminal' => false,
        ];
    }

    public function terminal(): static
    {
        return $this->state(['is_terminal' => true]);
    }
}
