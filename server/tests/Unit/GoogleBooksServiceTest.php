<?php

namespace Tests\Unit;

use App\Services\Books\GoogleBooksService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleBooksServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    public function test_search_uses_available_google_books_image_size(): void
    {
        Http::fake([
            'www.googleapis.com/books/v1/volumes*' => Http::response([
                'items' => [
                    [
                        'id' => 'volume-one',
                        'volumeInfo' => [
                            'title' => 'Image Size Book',
                            'imageLinks' => [
                                'medium' => '//books.google.com/books/content?id=volume-one&img=1',
                            ],
                        ],
                        'accessInfo' => [
                            'embeddable' => true,
                            'viewability' => 'PARTIAL',
                            'webReaderLink' => 'http://play.google.com/books/reader?id=volume-one',
                            'pdf' => ['isAvailable' => true],
                            'epub' => ['isAvailable' => false],
                        ],
                    ],
                ],
            ]),
        ]);

        $results = (new GoogleBooksService())->search('image sizes', 1);

        $this->assertSame(
            'https://books.google.com/books/content?id=volume-one&img=1',
            $results[0]['thumbnail'],
        );
        $this->assertSame('https://play.google.com/books/reader?id=volume-one', $results[0]['reader_link']);
        $this->assertTrue($results[0]['embeddable']);
        $this->assertSame('PARTIAL', $results[0]['viewability']);
        $this->assertTrue($results[0]['pdf_available']);
        $this->assertFalse($results[0]['epub_available']);
    }

    public function test_search_falls_back_to_google_books_cover_endpoint(): void
    {
        Http::fake([
            'www.googleapis.com/books/v1/volumes*' => Http::response([
                'items' => [
                    [
                        'id' => 'volume-two',
                        'volumeInfo' => [
                            'title' => 'Fallback Cover Book',
                        ],
                    ],
                ],
            ]),
        ]);

        $results = (new GoogleBooksService())->search('fallback cover', 1);

        $this->assertSame(
            'https://books.google.com/books/content?id=volume-two&printsec=frontcover&img=1&zoom=2&source=gbs_api',
            $results[0]['thumbnail'],
        );
    }

    public function test_search_prefers_isbn_cover_when_available(): void
    {
        Http::fake([
            'www.googleapis.com/books/v1/volumes*' => Http::response([
                'items' => [
                    [
                        'id' => 'volume-three',
                        'volumeInfo' => [
                            'title' => 'ISBN Cover Book',
                            'industryIdentifiers' => [
                                ['type' => 'ISBN_13', 'identifier' => '978-1-4833-4980-0'],
                            ],
                            'imageLinks' => [
                                'thumbnail' => 'https://books.google.com/books/content?id=volume-three&img=1',
                            ],
                        ],
                    ],
                ],
            ]),
        ]);

        $results = (new GoogleBooksService())->search('isbn cover', 1);

        $this->assertSame(
            'https://covers.openlibrary.org/b/isbn/9781483349800-M.jpg?default=false',
            $results[0]['thumbnail'],
        );
    }
}
