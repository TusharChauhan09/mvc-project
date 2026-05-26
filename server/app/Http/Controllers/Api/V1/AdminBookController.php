<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\BookStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookResource;
use App\Models\Book;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminBookController extends Controller
{
    // GET /admin/books  (filter by status — pass status=all for everything)
    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $status = $request->string('status')->toString() ?: 'pending';
        $q = $request->string('q')->toString();

        $items = Book::query()
            ->when($status !== 'all', fn ($w) => $w->where('status', $status))
            ->when($q, function ($w) use ($q) {
                $like = '%' . $q . '%';
                $w->where(function ($x) use ($like) {
                    $x->where('title', 'ilike', $like)
                      ->orWhere('isbn_13', 'ilike', $like)
                      ->orWhere('isbn_10', 'ilike', $like);
                });
            })
            ->with('addedBy')
            ->latest('id')
            ->paginate(50);

        return response()->json($items);
    }

    // PATCH /admin/books/{book}  — generic edit (title, price, etc.)
    public function update(Request $request, Book $book): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'subtitle' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'price_paise' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string', 'in:pending,approved,rejected'],
        ]);

        $book->update($data);
        Cache::flush();

        return response()->json(['data' => new BookResource($book->fresh())]);
    }

    // DELETE /admin/books/{book}
    public function destroy(Request $request, Book $book): JsonResponse
    {
        $this->ensureAdmin($request);
        $book->delete();
        Cache::flush();
        return response()->json(['message' => 'Book deleted.']);
    }

    // PATCH /admin/books/{book}/approve
    public function approve(Request $request, Book $book): JsonResponse
    {
        $this->ensureAdmin($request);
        $book->status = BookStatus::Approved;
        $book->review_note = null;
        $book->save();
        Cache::flush();
        return response()->json(['data' => new BookResource($book)]);
    }

    // PATCH /admin/books/{book}/reject
    public function reject(Request $request, Book $book): JsonResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        $book->status = BookStatus::Rejected;
        $book->review_note = $data['note'] ?? null;
        $book->save();
        Cache::flush();
        return response()->json(['data' => new BookResource($book)]);
    }

    private function ensureAdmin(Request $request): void
    {
        if (!$request->user()?->isAdmin()) {
            abort(403);
        }
    }
}
