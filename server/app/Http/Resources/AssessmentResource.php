<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssessmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'book_id' => $this->book_id,
            'user_id' => $this->user_id,
            'institution_id' => $this->institution_id,
            'status' => $this->status?->value,
            'overall_score' => $this->overall_score === null ? null : (float) $this->overall_score,
            'summary' => $this->summary,
            'recommendation' => $this->recommendation,
            'submitted_at' => $this->submitted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'book' => new BookResource($this->whenLoaded('book')),
            'user' => new UserResource($this->whenLoaded('user')),
            'scores' => ScoreResource::collection($this->whenLoaded('scores')),
        ];
    }
}
