<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserBookResource;
use App\Models\Book;
use App\Models\UserBook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class LibraryController extends Controller
{
    private const STATUSES = ['want_to_read', 'reading', 'read'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
            'in_cart' => ['nullable', 'boolean'],
            'book_id' => ['nullable', 'integer', 'exists:books,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = UserBook::query()
            ->where('user_id', $request->user()->id)
            ->with('book')
            ->latest('updated_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->has('in_cart')) {
            $query->where('in_cart', $request->boolean('in_cart'));
        }

        if ($request->filled('book_id')) {
            $query->where('book_id', $request->integer('book_id'));
        }

        $items = $query->simplePaginate((int) $request->integer('per_page', 20));

        return UserBookResource::collection($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
            'in_cart' => ['nullable', 'boolean'],
        ]);

        $entry = UserBook::updateOrCreate(
            ['user_id' => $request->user()->id, 'book_id' => $data['book_id']],
            [
                'status' => $data['status'] ?? 'want_to_read',
                'in_cart' => $data['in_cart'] ?? false,
            ],
        );

        return response()->json(['data' => new UserBookResource($entry->load('book'))], 201);
    }

    public function update(Request $request, Book $book): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
            'in_cart' => ['nullable', 'boolean'],
        ]);

        $entry = UserBook::firstOrCreate(
            ['user_id' => $request->user()->id, 'book_id' => $book->id],
            ['status' => 'want_to_read', 'in_cart' => false],
        );

        $updates = [];
        if (array_key_exists('status', $data)) {
            $updates['status'] = $data['status'] ?? 'want_to_read';
        }
        if (array_key_exists('in_cart', $data)) {
            $updates['in_cart'] = (bool) $data['in_cart'];
        }

        if ($updates !== []) {
            $entry->update($updates);
        }

        return response()->json(['data' => new UserBookResource($entry->load('book'))]);
    }

    public function destroy(Request $request, Book $book): JsonResponse
    {
        $entry = UserBook::query()
            ->where('user_id', $request->user()->id)
            ->where('book_id', $book->id)
            ->first();

        if (!$entry) {
            return response()->json(['message' => 'Entry not found.'], 404);
        }

        $entry->delete();

        return response()->json(['message' => 'Removed.']);
    }
}
