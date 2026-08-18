<?php

namespace Database\Factories;

use App\Models\Candidate;
use App\Models\Organization;
use App\Models\TalentPoolEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TalentPoolEntry>
 */
class TalentPoolEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'candidate_id' => Candidate::factory(),
            'tags' => fake()->randomElements(['senior', 'backend', 'frontend', 'design', 'remote'], 2),
            'note' => fake()->optional()->sentence(),
        ];
    }
}
