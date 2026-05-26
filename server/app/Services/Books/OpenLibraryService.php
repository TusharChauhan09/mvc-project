<?php

namespace App\Services\Books;

use App\Enums\BookSource;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class OpenLibraryService implements BookProvider
{
    private const BASE = 'https://openlibrary.org';
    private const COVERS = 'https://covers.openlibrary.org';

    public function __construct(private readonly int $cacheTtl = 3600) {}

    public function search(string $query, int $limit = 20): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $key = 'openlib:search:'.md5($query.':'.$limit);
        return Cache::remember($key, $this->cacheTtl, function () use ($query, $limit) {
            $resp = Http::timeout(10)->get(self::BASE.'/search.json', [
                'q' => $query,
                'limit' => min(50, max(1, $limit)),
            ]);
            if (! $resp->successful()) {
                return [];
            }
            $docs = $resp->json('docs') ?? [];
            return array_map(fn ($d) => $this->normalize($d), $docs);
        });
    }

    public function findByExternalId(string $id): ?array
    {
        $id = ltrim($id, '/');
        $key = 'openlib:work:'.$id;
        return Cache::remember($key, $this->cacheTtl, function () use ($id) {
            $resp = Http::timeout(10)->get(self::BASE.'/works/'.$id.'.json');
            if (! $resp->successful()) {
                return null;
            }
            return $this->normalize($resp->json());
        });
    }

    private function normalize(array $doc): array
    {
        $coverId = $doc['cover_i'] ?? ($doc['covers'][0] ?? null);
        $key = $doc['key'] ?? null;
        $external = $key ? ltrim(str_replace('/works/', '', $key), '/') : null;

        return [
            'source' => BookSource::OpenLibrary->value,
            'external_id' => $external,
            'title' => $doc['title'] ?? 'Untitled',
            'subtitle' => $doc['subtitle'] ?? null,
            'authors' => Arr::wrap($doc['author_name'] ?? []),
            'publisher' => isset($doc['publisher'][0]) ? $doc['publisher'][0] : null,
            'published_date' => isset($doc['first_publish_year']) ? (string) $doc['first_publish_year'] : null,
            'isbn_10' => $doc['isbn'][0] ?? null,
            'isbn_13' => null,
            'language' => isset($doc['language'][0]) ? $doc['language'][0] : null,
            'page_count' => $doc['number_of_pages_median'] ?? null,
            'categories' => Arr::wrap($doc['subject'] ?? []),
            'description' => is_array($doc['description'] ?? null) ? ($doc['description']['value'] ?? null) : ($doc['description'] ?? null),
            'thumbnail' => $coverId ? self::COVERS.'/b/id/'.$coverId.'-M.jpg' : null,
            'preview_link' => $key ? self::BASE.$key : null,
            'metadata' => [],
        ];
    }
}
