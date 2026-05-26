<?php

namespace Database\Factories;

use App\Enums\BookSource;
use App\Enums\BookType;
use App\Models\Book;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Book>
 */
class BookFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'subtitle' => fake()->optional()->sentence(6),
            'authors' => [fake()->name()],
            'publisher' => fake()->company(),
            'published_date' => (string) fake()->year(),
            'isbn_13' => fake()->isbn13(),
            'language' => 'en',
            'page_count' => fake()->numberBetween(50, 1200),
            'categories' => ['Education'],
            'description' => fake()->paragraph(),
            'thumbnail' => null,
            'type' => BookType::Textbook->value,
            'source' => BookSource::Manual->value,
        ];
    }
}
