<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Criterion extends Model
{
    use HasFactory;

    protected $table = 'criteria';

    protected $fillable = [
        'key', 'name', 'description', 'scale_min', 'scale_max',
        'weight', 'is_active', 'institution_id', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'scale_min' => 'integer',
            'scale_max' => 'integer',
            'weight' => 'decimal:2',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function scores(): HasMany
    {
        return $this->hasMany(Score::class);
    }
}
