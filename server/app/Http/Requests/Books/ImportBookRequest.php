<?php

namespace App\Http\Requests\Books;

use App\Enums\BookType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && $user->role->canManageBooks();
    }

    public function rules(): array
    {
        return [
            'source' => ['required', Rule::in(['google_books', 'open_library'])],
            'external_id' => ['required', 'string', 'max:255'],
            'type' => ['nullable', Rule::in(BookType::values())],
        ];
    }
}
