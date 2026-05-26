<?php

namespace App\Http\Requests\Assessments;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && $user->role->canAssess();
    }

    public function rules(): array
    {
        return [
            'book_id' => ['required', 'integer', 'exists:books,id'],
            'summary' => ['nullable', 'string'],
            'recommendation' => ['nullable', 'string'],
            'scores' => ['nullable', 'array'],
            'scores.*.criterion_id' => ['required_with:scores', 'integer', 'exists:criteria,id'],
            'scores.*.value' => ['required_with:scores', 'numeric', 'min:0', 'max:10'],
            'scores.*.note' => ['nullable', 'string'],
        ];
    }
}
