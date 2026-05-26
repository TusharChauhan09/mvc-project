<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\BookSource;
use App\Enums\BookStatus;
use App\Enums\BookType;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookResource;
use App\Models\Book;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class SellerBookController extends Controller
{
    // GET /me/seller/books
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            abort(403, 'Only sellers can view their listings.');
        }

        $items = Book::query()
            ->where('added_by', $user->id)
            ->latest('id')
            ->get();

        return response()->json(['data' => BookResource::collection($items)]);
    }

    // POST /me/seller/books  (multipart with optional cover file)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            abort(403, 'Only sellers can submit books.');
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'authors' => ['nullable', 'string', 'max:500'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'published_date' => ['nullable', 'string', 'max:32'],
            'isbn_10' => ['nullable', 'string', 'max:20'],
            'isbn_13' => ['nullable', 'string', 'max:20'],
            'language' => ['nullable', 'string', 'max:8'],
            'page_count' => ['nullable', 'integer', 'min:0'],
            'categories' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:10000'],
            'type' => ['nullable', 'string', Rule::in(['textbook', 'reference', 'ebook'])],
            'cover' => ['nullable', 'image', 'max:4096', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $coverPath = null;
        if ($request->hasFile('cover')) {
            $coverPath = $request->file('cover')->store('book-covers', 'public');
        }

        $book = Book::create([
            'title' => $data['title'],
            'subtitle' => $data['subtitle'] ?? null,
            'authors' => array_values(array_filter(array_map(
                'trim',
                preg_split('/\s*,\s*/', $data['authors'] ?? ''),
            ))),
            'publisher' => $data['publisher'] ?? null,
            'published_date' => $data['published_date'] ?? null,
            'isbn_10' => $data['isbn_10'] ?? null,
            'isbn_13' => $data['isbn_13'] ?? null,
            'language' => $data['language'] ?? null,
            'page_count' => $data['page_count'] ?? null,
            'categories' => array_values(array_filter(array_map(
                'trim',
                preg_split('/\s*,\s*/', $data['categories'] ?? ''),
            ))),
            'description' => $data['description'] ?? null,
            'cover_image_path' => $coverPath,
            'type' => $data['type'] ?? BookType::Textbook->value,
            'source' => BookSource::Manual->value,
            'status' => $user->isAdmin()
                ? BookStatus::Approved->value
                : BookStatus::Pending->value,
            'added_by' => $user->id,
        ]);

        Cache::flush();

        return response()->json(['data' => new BookResource($book)], 201);
    }
}
