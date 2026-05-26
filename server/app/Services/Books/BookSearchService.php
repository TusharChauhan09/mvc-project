<?php

namespace App\Services\Books;

class BookSearchService
{
    /**
     * @param  array<int, BookProvider>  $providers
     */
    public function __construct(private readonly array $providers) {}

    public function search(string $query, int $limit = 20): array
    {
        $results = [];
        foreach ($this->providers as $provider) {
            $batch = $provider->search($query, $limit);
            if (! empty($batch)) {
                $results = array_merge($results, $batch);
                if (count($results) >= $limit) {
                    break;
                }
            }
        }
        return array_slice($results, 0, $limit);
    }

    public function findByExternalId(string $source, string $id): ?array
    {
        foreach ($this->providers as $provider) {
            if ($provider instanceof GoogleBooksService && $source === 'google_books') {
                return $provider->findByExternalId($id);
            }
            if ($provider instanceof OpenLibraryService && $source === 'open_library') {
                return $provider->findByExternalId($id);
            }
        }
        return null;
    }
}
