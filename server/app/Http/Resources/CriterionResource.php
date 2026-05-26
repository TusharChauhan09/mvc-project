<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CriterionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'scale_min' => $this->scale_min,
            'scale_max' => $this->scale_max,
            'weight' => (float) $this->weight,
            'is_active' => $this->is_active,
            'institution_id' => $this->institution_id,
            'sort_order' => $this->sort_order,
        ];
    }
}
