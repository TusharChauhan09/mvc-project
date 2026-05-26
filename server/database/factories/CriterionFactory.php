<?php

namespace Database\Factories;

use App\Models\Criterion;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Criterion>
 */
class CriterionFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);
        return [
            'key' => Str::slug($name).'-'.Str::random(4),
            'name' => ucwords($name),
            'description' => fake()->sentence(),
            'scale_min' => 1,
            'scale_max' => 5,
            'weight' => 1.0,
            'is_active' => true,
            'sort_order' => fake()->numberBetween(1, 10),
        ];
    }
}
