<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'book_id',
        'amount', 'currency',
        'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
        'status',
        'ship_name', 'ship_phone', 'ship_line1', 'ship_line2',
        'ship_city', 'ship_state', 'ship_postal', 'ship_country',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }
}
