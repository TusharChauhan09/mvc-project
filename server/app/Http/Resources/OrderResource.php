<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'book_id' => $this->book_id,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'razorpay_order_id' => $this->razorpay_order_id,
            'razorpay_payment_id' => $this->razorpay_payment_id,
            'shipping' => [
                'name' => $this->ship_name,
                'phone' => $this->ship_phone,
                'line1' => $this->ship_line1,
                'line2' => $this->ship_line2,
                'city' => $this->ship_city,
                'state' => $this->ship_state,
                'postal' => $this->ship_postal,
                'country' => $this->ship_country,
            ],
            'book' => new BookResource($this->whenLoaded('book')),
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
