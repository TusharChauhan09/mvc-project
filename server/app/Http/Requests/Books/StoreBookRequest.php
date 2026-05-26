<?php

namespace App\Http\Requests\Books;

use App\Enums\BookSource;
use App\Enums\BookType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && $user->role->canManageBooks();
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:500'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'authors' => ['nullable', 'array'],
            'authors.*' => ['string', 'max:255'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'published_date' => ['nullable', 'string', 'max:32'],
            'isbn_10' => ['nullable', 'string', 'max:20'],
            'isbn_13' => ['nullable', 'string', 'max:20'],
            'language' => ['nullable', 'string', 'max:8'],
            'page_count' => ['nullable', 'integer', 'min:1'],
            'categories' => ['nullable', 'array'],
            'categories.*' => ['string', 'max:255'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'url', 'max:1000'],
            'preview_link' => ['nullable', 'url', 'max:1000'],
            'type' => ['required', Rule::in(BookType::values())],
            'source' => ['nullable', Rule::in(array_column(BookSource::cases(), 'value'))],
            'external_id' => ['nullable', 'string', 'max:255'],
        ];
    }
}
