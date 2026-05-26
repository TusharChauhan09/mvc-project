<?php

namespace App\Services\Books;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class GutendexService
{
    private const BASE = 'https://gutendex.com';
    private const TEXT_BYTES_LIMIT = 200_000;

    public function __construct(private readonly int $cacheTtl = 3600) {}

    /**
     * Search Project Gutenberg by title/author. Returns metadata only.
     *
     * @return array<int, array<string, mixed>>
     */
    public function search(string $query, int $limit = 10): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $key = 'gutendex:search:'.md5($query.':'.$limit);
        return Cache::remember($key, $this->cacheTtl, function () use ($query, $limit) {
            $resp = Http::timeout(10)->get(self::BASE.'/books', ['search' => $query]);
            if (! $resp->successful()) {
                return [];
            }
            $items = $resp->json('results') ?? [];
            return array_slice(array_map(fn ($i) => $this->normalize($i), $items), 0, $limit);
        });
    }

    /**
     * Find a Gutenberg book by ID and return a normalized record (with text URL).
     */
    public function findById(int|string $id): ?array
    {
        $key = 'gutendex:book:'.$id;
        return Cache::remember($key, $this->cacheTtl, function () use ($id) {
            $resp = Http::timeout(10)->get(self::BASE.'/books/'.$id);
            if (! $resp->successful()) {
                return null;
            }
            return $this->normalize($resp->json());
        });
    }

    /**
     * Fetch a sample of plaintext for readability/scoring. Capped to TEXT_BYTES_LIMIT.
     */
    public function fetchSampleText(string $url): ?string
    {
        $key = 'gutendex:text:'.md5($url);
        return Cache::remember($key, $this->cacheTtl, function () use ($url) {
            $resp = Http::timeout(15)->withOptions(['stream' => false])->get($url);
            if (! $resp->successful()) {
                return null;
            }
            $body = $resp->body();
            if (strlen($body) > self::TEXT_BYTES_LIMIT) {
                $body = substr($body, 0, self::TEXT_BYTES_LIMIT);
            }
            return $this->stripGutenbergHeader($body);
        });
    }

    private function normalize(array $item): array
    {
        $formats = $item['formats'] ?? [];
        $textUrl = $formats['text/plain; charset=utf-8']
            ?? $formats['text/plain; charset=us-ascii']
            ?? $formats['text/plain']
            ?? null;

        return [
            'source' => 'gutendex',
            'external_id' => (string) ($item['id'] ?? ''),
            'title' => $item['title'] ?? 'Untitled',
            'authors' => array_map(fn ($a) => $a['name'] ?? '', $item['authors'] ?? []),
            'languages' => $item['languages'] ?? [],
            'subjects' => $item['subjects'] ?? [],
            'download_count' => $item['download_count'] ?? 0,
            'text_url' => $textUrl,
            'metadata' => [
                'bookshelves' => $item['bookshelves'] ?? [],
                'copyright' => $item['copyright'] ?? null,
            ],
        ];
    }

    private function stripGutenbergHeader(string $text): string
    {
        $startMarker = '*** START OF';
        $endMarker = '*** END OF';
        $startPos = strpos($text, $startMarker);
        if ($startPos !== false) {
            $newlinePos = strpos($text, "\n", $startPos);
            if ($newlinePos !== false) {
                $text = substr($text, $newlinePos + 1);
            }
        }
        $endPos = strpos($text, $endMarker);
        if ($endPos !== false) {
            $text = substr($text, 0, $endPos);
        }
        return trim($text);
    }
}
