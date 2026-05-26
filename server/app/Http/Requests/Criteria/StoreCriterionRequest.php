<?php

namespace App\Http\Requests\Criteria;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCriterionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && $user->role->canManageCriteria();
    }

    public function rules(): array
    {
        $criterionId = $this->route('criterion')?->id;
        return [
            'key' => ['required', 'string', 'max:64', Rule::unique('criteria', 'key')->ignore($criterionId)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'scale_min' => ['required', 'integer', 'min:0', 'max:10'],
            'scale_max' => ['required', 'integer', 'gt:scale_min', 'max:10'],
            'weight' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['boolean'],
            'institution_id' => ['nullable', 'integer', 'exists:institutions,id'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }
}
