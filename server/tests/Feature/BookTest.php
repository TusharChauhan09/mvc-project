<?php

namespace Tests\Feature;

use App\Enums\BookSource;
use App\Models\Book;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BookTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_books(): void
    {
        Book::factory()->count(3)->create();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/books')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_reviewer_cannot_create_book(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->postJson('/api/v1/books', [
                'title' => 'X',
                'type' => 'textbook',
            ])->assertForbidden();
    }

    public function test_educator_can_create_book(): void
    {
        $user = User::factory()->educator()->create();
        $this->actingAs($user)
            ->postJson('/api/v1/books', [
                'title' => 'Calculus',
                'type' => 'textbook',
                'authors' => ['Spivak'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Calculus');
    }

    public function test_search_filters_by_title(): void
    {
        Book::factory()->create(['title' => 'Linear Algebra']);
        Book::factory()->create(['title' => 'Discrete Math']);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/books?q=algebra')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_external_cover_proxies_allowed_image_urls(): void
    {
        Http::fake([
            'books.google.com/books/content*' => Http::response('image-bytes', 200, [
                'Content-Type' => 'image/jpeg',
            ]),
        ]);

        $this->get('/api/v1/books/external/cover?url='.urlencode('https://books.google.com/books/content?id=abc&img=1'))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
    }

    public function test_external_cover_rejects_unsupported_hosts(): void
    {
        $this->get('/api/v1/books/external/cover?url='.urlencode('https://example.com/cover.jpg'))
            ->assertUnprocessable();
    }

    public function test_google_book_without_stored_thumbnail_gets_isbn_cover_url(): void
    {
        Book::factory()->create([
            'source' => BookSource::GoogleBooks->value,
            'external_id' => 'volume-two',
            'thumbnail' => null,
            'isbn_13' => '9781412974172',
            'isbn_10' => null,
        ]);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/books')
            ->assertOk()
            ->assertJsonPath(
                'data.0.thumbnail',
                'https://covers.openlibrary.org/b/isbn/9781412974172-M.jpg?default=false',
            );
    }
}
