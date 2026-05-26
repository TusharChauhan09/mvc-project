<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScoreResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'criterion_id' => $this->criterion_id,
            'criterion' => new CriterionResource($this->whenLoaded('criterion')),
            'value' => (float) $this->value,
            'note' => $this->note,
        ];
    }
}
