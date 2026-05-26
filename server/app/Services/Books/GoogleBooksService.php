<?php

namespace App\Services\Books;

use App\Enums\BookSource;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class GoogleBooksService implements BookProvider
{
    private const BASE = 'https://www.googleapis.com/books/v1';
    private const BASE_COVER = 'https://books.google.com/books/content?id=';

    public function __construct(
        private readonly ?string $apiKey = null,
        private readonly int $cacheTtl = 3600,
    ) {
    }

    public function search(string $query, int $limit = 20): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $key = 'gbooks:search:v4:' . md5($query . ':' . $limit);
        return Cache::remember($key, $this->cacheTtl, function () use ($query, $limit) {
            $params = [
                'q' => $query,
                'maxResults' => min(40, max(1, $limit)),
                'printType' => 'books',
                'projection' => 'full',
            ];
            if ($this->apiKey) {
                $params['key'] = $this->apiKey;
            }

            $resp = Http::timeout(10)->get(self::BASE . '/volumes', $params);
            if (!$resp->successful()) {
                return [];
            }
            $items = $resp->json('items') ?? [];
            return array_map(fn($item) => $this->normalize($item), $items);
        });
    }

    public function findByExternalId(string $id): ?array
    {
        $key = 'gbooks:vol:v4:' . $id;
        return Cache::remember($key, $this->cacheTtl, function () use ($id) {
            $params = [];
            if ($this->apiKey) {
                $params['key'] = $this->apiKey;
            }
            $resp = Http::timeout(10)->get(self::BASE . '/volumes/' . $id, $params);
            if (!$resp->successful()) {
                return null;
            }
            return $this->normalize($resp->json());
        });
    }

    private function normalize(array $item): array
    {
        $info = $item['volumeInfo'] ?? [];
        $identifiers = collect($info['industryIdentifiers'] ?? [])
            ->keyBy('type')
            ->map(fn($i) => $i['identifier'] ?? null)
            ->all();

        $thumbnail = $this->isbnCoverUrl($identifiers) ?? $this->thumbnailUrl($info['imageLinks'] ?? [], $item['id'] ?? null);
        $access = $item['accessInfo'] ?? [];
        $epub = $access['epub'] ?? [];
        $pdf = $access['pdf'] ?? [];
        $reader = $access['webReaderLink'] ?? null;
        $preview = $reader ?? $info['previewLink'] ?? null;

        return [
            'source' => BookSource::GoogleBooks->value,
            'external_id' => $item['id'] ?? null,
            'title' => $info['title'] ?? 'Untitled',
            'subtitle' => $info['subtitle'] ?? null,
            'authors' => Arr::wrap($info['authors'] ?? []),
            'publisher' => $info['publisher'] ?? null,
            'published_date' => $info['publishedDate'] ?? null,
            'isbn_10' => $identifiers['ISBN_10'] ?? null,
            'isbn_13' => $identifiers['ISBN_13'] ?? null,
            'language' => $info['language'] ?? null,
            'page_count' => $info['pageCount'] ?? null,
            'categories' => Arr::wrap($info['categories'] ?? []),
            'description' => $info['description'] ?? null,
            'thumbnail' => $this->toHttps($thumbnail),
            'preview_link' => $this->toHttps($preview),
            'reader_link' => $this->toHttps($reader ?? $preview),
            'embeddable' => (bool) ($access['embeddable'] ?? false),
            'viewability' => $access['viewability'] ?? null,
            'pdf_available' => (bool) ($pdf['isAvailable'] ?? false),
            'epub_available' => (bool) ($epub['isAvailable'] ?? false),
            'metadata' => [
                'average_rating' => $info['averageRating'] ?? null,
                'ratings_count' => $info['ratingsCount'] ?? null,
                'info_link' => $this->toHttps($info['infoLink'] ?? null),
                'canonical_volume_link' => $this->toHttps($info['canonicalVolumeLink'] ?? null),
                'reader_link' => $this->toHttps($reader ?? $preview),
                'embeddable' => (bool) ($access['embeddable'] ?? false),
                'viewability' => $access['viewability'] ?? null,
                'text_to_speech_permission' => $access['textToSpeechPermission'] ?? null,
                'public_domain' => (bool) ($access['publicDomain'] ?? false),
                'pdf_available' => (bool) ($pdf['isAvailable'] ?? false),
                'pdf_download_link' => $this->toHttps($pdf['downloadLink'] ?? null),
                'epub_available' => (bool) ($epub['isAvailable'] ?? false),
                'epub_download_link' => $this->toHttps($epub['downloadLink'] ?? null),
            ],
        ];
    }

    private function toHttps(?string $url): ?string
    {
        if (!$url) {
            return null;
        }
        if (str_starts_with($url, '//')) {
            return 'https:' . $url;
        }
        if (str_starts_with($url, 'http://')) {
            return 'https://' . substr($url, 7);
        }
        return $url;
    }

    /**
     * Google Books may return any subset of these sizes depending on the volume.
     */
    private function thumbnailUrl(array $imageLinks, ?string $id): ?string
    {
        foreach (['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail'] as $size) {
            if (! empty($imageLinks[$size])) {
                return $this->toHttps($imageLinks[$size]);
            }
        }

        if (! $id) {
            return null;
        }

        return self::BASE_COVER . rawurlencode($id) . '&printsec=frontcover&img=1&zoom=2&source=gbs_api';
    }

    private function isbnCoverUrl(array $identifiers): ?string
    {
        $isbn = $identifiers['ISBN_13'] ?? $identifiers['ISBN_10'] ?? null;
        if (! $isbn) {
            return null;
        }

        $isbn = preg_replace('/[^0-9Xx]/', '', $isbn);
        if (! $isbn) {
            return null;
        }

        return 'https://covers.openlibrary.org/b/isbn/'.rawurlencode($isbn).'-M.jpg?default=false';
    }
}
