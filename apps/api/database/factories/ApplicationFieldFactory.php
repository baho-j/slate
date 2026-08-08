<?php

namespace Database\Factories;

use App\Enums\FieldType;
use App\Models\ApplicationField;
use App\Models\Job;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApplicationField>
 */
class ApplicationFieldFactory extends Factory
{
    public function definition(): array
    {
        $label = fake()->unique()->words(2, true);

        return [
            'job_id' => Job::factory(),
            'label' => ucfirst($label),
            'key' => str_replace(' ', '_', $label),
            'type' => FieldType::Text,
            'required' => false,
            'options' => null,
            'order' => 0,
        ];
    }

    public function type(FieldType $type): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => $type,
            'options' => $type->hasOptions() ? ['one', 'two', 'three'] : null,
        ]);
    }

    public function required(): static
    {
        return $this->state(fn (array $attributes) => ['required' => true]);
    }
}
