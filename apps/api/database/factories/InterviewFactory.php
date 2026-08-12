<?php

namespace Database\Factories;

use App\Enums\InterviewStatus;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Interview;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Interview>
 */
class InterviewFactory extends Factory
{
    public function definition(): array
    {
        return [
            'application_id' => Application::factory(),
            'interviewer_id' => User::factory()->state(['role' => UserRole::Interviewer]),
            'scheduled_at' => fake()->dateTimeBetween('+1 day', '+3 weeks'),
            'location' => fake()->randomElement(['Google Meet', 'Teams', 'Helsinki office']),
            'status' => InterviewStatus::Scheduled,
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Interview $interview) {
            if ($interview->organization_id === null) {
                $interview->organization_id = Application::withoutGlobalScopes()
                    ->whereKey($interview->application_id)
                    ->value('organization_id');
            }
        });
    }

    public function status(InterviewStatus $status): static
    {
        return $this->state(['status' => $status]);
    }

    public function past(): static
    {
        return $this->state(['scheduled_at' => fake()->dateTimeBetween('-3 weeks', '-1 day')]);
    }
}
