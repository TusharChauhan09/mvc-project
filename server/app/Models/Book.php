<?php

namespace App\Models;

use App\Enums\BookSource;
use App\Enums\BookStatus;
use App\Enums\BookType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Book extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'subtitle',
        'authors',
        'publisher',
        'published_date',
        'isbn_10',
        'isbn_13',
        'language',
        'page_count',
        'price_paise',
        'categories',
        'description',
        'thumbnail',
        'cover_image_path',
        'preview_link',
        'type',
        'source',
        'status',
        'review_note',
        'external_id',
        'metadata',
        'added_by',
    ];

    protected function casts(): array
    {
        return [
            'authors' => 'array',
            'categories' => 'array',
            'metadata' => 'array',
            'page_count' => 'integer',
            'price_paise' => 'integer',
            'type' => BookType::class,
            'source' => BookSource::class,
            'status' => BookStatus::class,
        ];
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    public function libraryEntries(): HasMany
    {
        return $this->hasMany(UserBook::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function scopeSearch(Builder $q, ?string $term): Builder
    {
        $term = $term === null ? null : trim($term);
        if (!$term) {
            return $q;
        }
        $driver = $q->getModel()->getConnection()->getDriverName();
        $op = $driver === 'pgsql' ? 'ilike' : 'like';
        $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $term) . '%';
        return $q->where(function (Builder $w) use ($op, $like) {
            $w->where('title', $op, $like)
                ->orWhere('subtitle', $op, $like)
                ->orWhere('isbn_10', $op, $like)
                ->orWhere('isbn_13', $op, $like);
        });
    }

    public function averageScore(): ?float
    {
        $value = $this->assessments()
            ->where('status', 'submitted')
            ->avg('overall_score');
        return $value === null ? null : round((float) $value, 2);
    }
}
