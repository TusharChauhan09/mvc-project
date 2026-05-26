<?php

namespace App\Http\Requests\Assessments;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $assessment = $this->route('assessment');
        if (! $user || ! $assessment) {
            return false;
        }
        return $user->id === $assessment->user_id || $user->isAdmin();
    }

    public function rules(): array
    {
        return [
            'summary' => ['nullable', 'string'],
            'recommendation' => ['nullable', 'string'],
            'scores' => ['nullable', 'array'],
            'scores.*.criterion_id' => ['required_with:scores', 'integer', 'exists:criteria,id'],
            'scores.*.value' => ['required_with:scores', 'numeric', 'min:0', 'max:10'],
            'scores.*.note' => ['nullable', 'string'],
        ];
    }
}
