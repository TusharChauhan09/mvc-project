<?php

namespace App\Models;

use App\Enums\AssessmentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assessment extends Model
{
    use HasFactory;

    protected $fillable = [
        'book_id', 'user_id', 'institution_id', 'status',
        'overall_score', 'summary', 'recommendation', 'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => AssessmentStatus::class,
            'overall_score' => 'decimal:2',
            'submitted_at' => 'datetime',
        ];
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function scores(): HasMany
    {
        return $this->hasMany(Score::class);
    }

    public function recomputeOverall(): void
    {
        $scores = $this->scores()->with('criterion')->get();
        if ($scores->isEmpty()) {
            $this->overall_score = null;
            return;
        }

        $weightSum = 0.0;
        $weighted = 0.0;
        foreach ($scores as $score) {
            $criterion = $score->criterion;
            if (! $criterion || ! $criterion->is_active) {
                continue;
            }
            $w = (float) $criterion->weight;
            $weightSum += $w;
            $weighted += $w * (float) $score->value;
        }

        $this->overall_score = $weightSum > 0
            ? round($weighted / $weightSum, 2)
            : null;
    }
}
