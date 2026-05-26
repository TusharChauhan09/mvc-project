<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserBookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'book_id' => $this->book_id,
            'status' => $this->status,
            'in_cart' => (bool) $this->in_cart,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'book' => new BookResource($this->whenLoaded('book')),
        ];
    }
}
