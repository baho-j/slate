<?php

namespace Database\Factories;

use App\Enums\EmploymentType;
use App\Enums\JobStatus;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Job>
 */
class JobFactory extends Factory
{
    public function definition(): array
    {
        $min = fake()->numberBetween(30, 120) * 1000;

        return [
            'organization_id' => Organization::factory(),
            'created_by' => fn (array $attributes) => User::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'title' => fake()->jobTitle(),
            'description' => fake()->paragraphs(3, true),
            'department' => fake()->randomElement(['Engineering', 'Sales', 'Design', 'Operations']),
            'location' => fake()->city(),
            'employment_type' => fake()->randomElement(EmploymentType::cases()),
            'salary_min' => $min,
            'salary_max' => $min + fake()->numberBetween(10, 60) * 1000,
            'currency' => 'USD',
            'status' => JobStatus::Draft,
            'closing_date' => fake()->optional()->dateTimeBetween('+1 week', '+3 months'),
        ];
    }

    public function status(JobStatus $status): static
    {
        return $this->state(fn (array $attributes) => ['status' => $status]);
    }

    public function published(): static
    {
        return $this->status(JobStatus::Published);
    }
}
