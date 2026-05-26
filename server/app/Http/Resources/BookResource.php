<?php

namespace App\Http\Resources;

use App\Enums\BookSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $metadata = $this->metadata ?? [];

        return [
            'id' => $this->id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'authors' => $this->authors,
            'publisher' => $this->publisher,
            'published_date' => $this->published_date,
            'isbn_10' => $this->isbn_10,
            'isbn_13' => $this->isbn_13,
            'language' => $this->language,
            'page_count' => $this->page_count,
            'price_paise' => (int) ($this->price_paise ?? 49900),
            'categories' => $this->categories,
            'description' => $this->description,
            'thumbnail' => $this->thumbnailUrl(),
            'status' => $this->status?->value ?? 'approved',
            'review_note' => $this->review_note,
            'preview_link' => $this->preview_link,
            'reader_link' => $metadata['reader_link'] ?? $this->preview_link,
            'embeddable' => (bool) ($metadata['embeddable'] ?? false),
            'viewability' => $metadata['viewability'] ?? null,
            'pdf_available' => (bool) ($metadata['pdf_available'] ?? false),
            'epub_available' => (bool) ($metadata['epub_available'] ?? false),
            'type' => $this->type?->value,
            'source' => $this->source?->value,
            'external_id' => $this->external_id,
            'metadata' => $metadata,
            'average_score' => $this->whenLoaded('assessments', fn() => $this->averageScore()),
            'assessments_count' => $this->whenCounted('assessments'),
            'created_at' => $this->created_at,
        ];
    }

    private function thumbnailUrl(): ?string
    {
        // Seller-uploaded local cover wins over remote sources.
        if ($this->cover_image_path) {
            return rtrim(config('app.url', 'http://localhost:8000'), '/')
                . '/storage/' . ltrim($this->cover_image_path, '/');
        }

        if ($this->sourceValue() === BookSource::GoogleBooks->value) {
            $isbnCover = $this->isbnCoverUrl();
            if ($isbnCover) {
                return $isbnCover;
            }
        }

        $thumbnail = $this->normalizeCoverUrl($this->thumbnail);
        if ($thumbnail) {
            return $thumbnail;
        }

        if ($this->sourceValue() === BookSource::GoogleBooks->value && $this->external_id) {
            return 'https://books.google.com/books/content?id='
                . rawurlencode($this->external_id)
                . '&printsec=frontcover&img=1&zoom=2&source=gbs_api';
        }

        return $this->isbnCoverUrl();
    }

    private function normalizeCoverUrl(?string $url): ?string
    {
        if (!$url) {
            return null;
        }

        $url = trim($url);
        if ($url === '') {
            return null;
        }

        if (str_ends_with($url, '/cover-placeholder.svg') || str_ends_with($url, 'cover-placeholder.svg')) {
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

    private function sourceValue(): ?string
    {
        if ($this->source instanceof BookSource) {
            return $this->source->value;
        }

        return is_string($this->source) ? $this->source : null;
    }

    private function isbnCoverUrl(): ?string
    {
        $isbn = $this->isbn_13 ?: $this->isbn_10;
        if (!$isbn) {
            return null;
        }

        $isbn = preg_replace('/[^0-9Xx]/', '', $isbn);
        if (!$isbn) {
            return null;
        }

        return 'https://covers.openlibrary.org/b/isbn/'
            . rawurlencode($isbn)
            . '-M.jpg?default=false';
    }
}
