<?php

namespace Database\Factories;

use App\Enums\CriterionMode;
use App\Enums\CriterionOperator;
use App\Models\Job;
use App\Models\ScreeningCriterion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScreeningCriterion>
 */
class ScreeningCriterionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_id' => Job::factory(),
            'field_key' => 'years_experience',
            'operator' => CriterionOperator::Gte,
            'value' => 3,
            'mode' => CriterionMode::Knockout,
            'weight' => null,
        ];
    }

    public function scored(int $weight = 20): static
    {
        return $this->state(fn (array $attributes) => [
            'mode' => CriterionMode::Scored,
            'weight' => $weight,
        ]);
    }
}
