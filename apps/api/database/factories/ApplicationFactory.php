<?php

namespace Database\Factories;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_id' => Job::factory(),
            'candidate_id' => Candidate::factory(),
            'current_stage_id' => null,
            'status' => ApplicationStatus::Applied,
            'eligibility' => 'manual',
            'cover_note' => fake()->optional()->paragraph(),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Application $application) {
            if ($application->organization_id === null) {
                $application->organization_id = Job::withoutGlobalScopes()
                    ->whereKey($application->job_id)
                    ->value('organization_id');
            }
        });
    }
}
