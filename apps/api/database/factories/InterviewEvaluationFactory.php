<?php

namespace Database\Factories;

use App\Enums\Recommendation;
use App\Models\Interview;
use App\Models\InterviewEvaluation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InterviewEvaluation>
 */
class InterviewEvaluationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'interview_id' => Interview::factory(),
            'rating' => fake()->numberBetween(1, 5),
            'recommendation' => fake()->randomElement(Recommendation::cases()),
            'comments' => fake()->optional()->paragraph(),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (InterviewEvaluation $evaluation) {
            if ($evaluation->organization_id === null) {
                $evaluation->organization_id = Interview::withoutGlobalScopes()
                    ->whereKey($evaluation->interview_id)
                    ->value('organization_id');
            }
        });
    }
}
