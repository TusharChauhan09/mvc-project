<?php

namespace Database\Seeders;

use App\Enums\BookSource;
use App\Enums\BookType;
use App\Enums\Role;
use App\Models\Book;
use App\Models\User;
use App\Services\Books\BookSearchService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;

class BookSeeder extends Seeder
{
    private const TARGET_COUNT = 240;
    private const SEARCH_QUERIES = [
        'calculus textbook',
        'linear algebra',
        'data structures and algorithms',
        'computer networks',
        'operating systems',
        'database systems',
        'software engineering',
        'artificial intelligence',
        'machine learning',
        'cybersecurity basics',
        'physics for engineers',
        'quantum physics',
        'organic chemistry',
        'inorganic chemistry',
        'biology textbook',
        'anatomy and physiology',
        'genetics basics',
        'statistics for beginners',
        'probability theory',
        'mathematical analysis',
        'business management',
        'marketing strategy',
        'finance fundamentals',
        'macroeconomics',
        'microeconomics',
        'entrepreneurship',
        'psychology introduction',
        'cognitive psychology',
        'clinical psychology',
        'modern history',
        'world history',
        'philosophy ethics',
        'logic and reasoning',
        'literary classics',
        'contemporary fiction',
        'poetry anthology',
        'american literature',
        'children stories',
        'young adult fantasy',
        'romance novel',
        'mystery thriller',
        'biography memoir',
        'self help habits',
        'health and wellness',
        'nursing fundamentals',
        'medical surgical',
        'engineering mechanics',
        'electrical circuits',
        'civil engineering',
        'architecture design',
        'environmental science',
        'astronomy guide',
        'geography atlas',
        'music theory',
        'art history',
        'graphic design',
        'project management',
        'communication skills',
        'public speaking',
        'law basics',
        'political science',
        'education pedagogy',
        'language learning spanish',
        'language learning french',
    ];

    public function run(): void
    {
        $adminId = User::query()
            ->where('role', Role::Admin->value)
            ->value('id');

        $search = app(BookSearchService::class);
        $existing = Book::query()->count();

        if ($existing < self::TARGET_COUNT) {
            $this->seedFromApis($search, $adminId, self::TARGET_COUNT - $existing);
        }

        $this->backfillMissingThumbnails($search);
    }

    private function seedFromApis(BookSearchService $search, ?int $adminId, int $needed): void
    {
        foreach (self::SEARCH_QUERIES as $query) {
            if ($needed <= 0) {
                break;
            }

            $batch = $search->search($query, min(20, $needed + 5));
            foreach ($batch as $payload) {
                if ($needed <= 0) {
                    break;
                }

                if (empty($payload['external_id']) || empty($payload['thumbnail'])) {
                    continue;
                }

                $data = array_merge(
                    Arr::except($payload, [
                        'reader_link',
                        'embeddable',
                        'viewability',
                        'pdf_available',
                        'epub_available',
                    ]),
                    [
                        'type' => BookType::Textbook->value,
                        'added_by' => $adminId,
                    ],
                );

                Book::updateOrCreate(
                    ['source' => $payload['source'], 'external_id' => $payload['external_id']],
                    $data,
                );

                $needed--;
            }
        }
    }

    private function backfillMissingThumbnails(BookSearchService $search): void
    {
        $books = Book::query()
            ->whereNull('thumbnail')
            ->orWhere('thumbnail', '/cover-placeholder.svg')
            ->get();

        foreach ($books as $book) {
            $thumbnail = $this->resolveThumbnail($book, $search);
            if (!$thumbnail) {
                continue;
            }

            $book->forceFill(['thumbnail' => $thumbnail])->save();
        }
    }

    private function resolveThumbnail(Book $book, BookSearchService $search): ?string
    {
        $source = $this->sourceValue($book->source);
        if ($source === BookSource::GoogleBooks->value && $book->external_id) {
            return $this->googleCoverUrl($book->external_id);
        }

        $isbn = $this->sanitizeIsbn($book->isbn_13 ?: $book->isbn_10);
        if ($isbn) {
            return $this->openLibraryCoverUrl($isbn);
        }

        $query = $this->searchQueryForBook($book);
        if (!$query) {
            return null;
        }

        foreach ($search->search($query, 5) as $hit) {
            if (!empty($hit['thumbnail'])) {
                return $hit['thumbnail'];
            }
        }

        return null;
    }

    private function searchQueryForBook(Book $book): ?string
    {
        $author = null;
        if (is_array($book->authors) && !empty($book->authors[0])) {
            $author = $book->authors[0];
        }

        $query = trim($book->title . ' ' . ($author ?? ''));
        return $query === '' ? null : $query;
    }

    private function sanitizeIsbn(?string $isbn): ?string
    {
        if (!$isbn) {
            return null;
        }

        $isbn = preg_replace('/[^0-9Xx]/', '', $isbn);
        return $isbn ?: null;
    }

    private function googleCoverUrl(string $externalId): string
    {
        return 'https://books.google.com/books/content?id='
            . rawurlencode($externalId)
            . '&printsec=frontcover&img=1&zoom=2&source=gbs_api';
    }

    private function openLibraryCoverUrl(string $isbn): string
    {
        return 'https://covers.openlibrary.org/b/isbn/'
            . rawurlencode($isbn)
            . '-L.jpg?default=false';
    }

    private function sourceValue($source): ?string
    {
        if ($source instanceof BookSource) {
            return $source->value;
        }

        return is_string($source) ? $source : null;
    }
}
