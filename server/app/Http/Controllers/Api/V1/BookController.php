<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\BookSource;
use App\Enums\BookType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Books\ImportBookRequest;
use App\Http\Requests\Books\StoreBookRequest;
use App\Http\Resources\AssessmentResource;
use App\Http\Resources\BookResource;
use App\Models\Book;
use App\Services\Books\BookSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class BookController extends Controller
{
    private const CATEGORY_TERMS = [
        'study-preparation' => ['study', 'exam', 'preparation', 'guide', 'test', 'entrance'],
        'mathematics' => ['mathematics', 'math', 'algebra', 'calculus', 'geometry', 'statistics'],
        'science' => ['science', 'physics', 'chemistry', 'biology', 'astronomy'],
        'computer-science' => ['computer', 'programming', 'software', 'data', 'algorithm'],
        'engineering' => ['engineering', 'technology', 'mechanical', 'electrical', 'civil'],
        'medicine' => ['medicine', 'medical', 'anatomy', 'health', 'nursing'],
        'business' => ['business', 'management', 'economics', 'finance', 'marketing'],
        'romance' => ['romance', 'romantic', 'love'],
        'history' => ['history', 'historical', 'civilization', 'war'],
        'literature' => ['literature', 'literary', 'fiction', 'poetry', 'drama'],
        'children' => ['children', 'juvenile', 'young adult', 'school'],
        'philosophy' => ['philosophy', 'ethics', 'logic', 'metaphysics'],
        'psychology' => ['psychology', 'mental', 'behavior', 'cognitive'],
    ];

    public function __construct(private readonly BookSearchService $searchService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $q = trim($request->string('q')->toString());
        $type = $request->string('type')->toString();
        $category = $request->string('category')->toString();
        $page = (int) $request->integer('page', 1);
        $perPage = (int) $request->integer('per_page', 15);

        $cacheKey = 'books:index:v2:' . md5(json_encode([
            'q' => $q,
            'type' => $type,
            'category' => $category,
            'page' => $page,
            'per_page' => $perPage,
        ]));

        $books = Cache::remember($cacheKey, now()->addMinutes(15), function () use ($q, $type, $category, $perPage) {
            return Book::query()
                ->where('status', 'approved')
                ->withCount(['assessments as submitted_assessments_count' => fn($q) => $q->where('status', 'submitted')])
                ->withAvg(['assessments as average_score' => fn($q) => $q->where('status', 'submitted')], 'overall_score')
                ->search($q ?: null)
                ->when($type !== '', fn($query) => $query->where('type', $type))
                ->when($category !== '', fn($query) => $this->applyCategoryFilter($query, $category))
                ->orderByDesc('id')
                ->simplePaginate($perPage);
        });

        return BookResource::collection($books);
    }

    public function store(StoreBookRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['source'] = $data['source'] ?? BookSource::Manual->value;
        $data['added_by'] = $request->user()->id;

        $book = Book::create($data);
        return response()->json(['data' => new BookResource($book)], 201);
    }

    public function show(Book $book): BookResource
    {
        $book->loadCount(['assessments as submitted_assessments_count' => fn($q) => $q->where('status', 'submitted')]);
        $book->loadAvg(['assessments as average_score' => fn($q) => $q->where('status', 'submitted')], 'overall_score');
        return new BookResource($book);
    }

    public function update(StoreBookRequest $request, Book $book): BookResource
    {
        $book->update($request->validated());
        return new BookResource($book);
    }

    public function destroy(Request $request, Book $book): JsonResponse
    {
        $this->authorize('delete', $book);
        $book->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    public function externalSearch(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        $results = $this->searchService->search(
            $request->string('q')->toString(),
            (int) $request->integer('limit', 20),
        );

        return response()->json(['data' => $results]);
    }

    public function externalCover(Request $request)
    {
        $request->validate([
            'url' => ['required', 'string', 'max:2000'],
        ]);

        $url = $this->safeCoverUrl($request->string('url')->toString());
        if (!$url) {
            return response()->json(['message' => 'Unsupported cover URL.'], 422);
        }

        $cover = Cache::remember('book-cover:' . md5($url), now()->addHours(12), function () use ($url) {
            $response = Http::timeout(12)
                ->withHeaders([
                    'Accept' => 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'User-Agent' => 'Bookify/1.0 (+https://localhost)',
                ])
                ->get($url);

            if (!$response->successful()) {
                return null;
            }

            $type = strtolower($response->header('Content-Type', 'image/jpeg'));
            if (!str_starts_with($type, 'image/')) {
                return null;
            }

            return [
                'body' => $response->body(),
                'type' => $type,
            ];
        });

        if (!$cover) {
            return response()->json(['message' => 'Cover image unavailable.'], 404);
        }

        return response($cover['body'], 200)
            ->header('Content-Type', $cover['type'])
            ->header('Cache-Control', 'public, max-age=43200');
    }

    public function import(ImportBookRequest $request): JsonResponse
    {
        $data = $request->validated();
        $payload = $this->searchService->findByExternalId($data['source'], $data['external_id']);
        if (!$payload) {
            return response()->json(['message' => 'Book not found in external source.'], 404);
        }

        $book = Book::updateOrCreate(
            ['source' => $payload['source'], 'external_id' => $payload['external_id']],
            array_merge(Arr::except($payload, [
                'reader_link',
                'embeddable',
                'viewability',
                'pdf_available',
                'epub_available',
            ]), [
                'type' => $data['type'] ?? BookType::Textbook->value,
                'added_by' => $request->user()->id,
            ]),
        );

        return response()->json(['data' => new BookResource($book)], 201);
    }

    public function assessments(Book $book): AnonymousResourceCollection
    {
        $items = $book->assessments()
            ->with(['user'])
            ->where('status', 'submitted')
            ->latest('submitted_at')
            ->simplePaginate(15);
        return AssessmentResource::collection($items);
    }

    private function applyCategoryFilter($query, string $category): void
    {
        $terms = self::CATEGORY_TERMS[$category] ?? [];
        if ($terms === []) {
            return;
        }

        $driver = $query->getModel()->getConnection()->getDriverName();
        $op = $driver === 'pgsql' ? 'ilike' : 'like';

        $query->where(function ($where) use ($terms, $driver, $op) {
            foreach ($terms as $term) {
                $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $term) . '%';
                $where->orWhere('title', $op, $like)
                    ->orWhere('subtitle', $op, $like);

                if ($driver === 'pgsql') {
                    $where->orWhereRaw('categories::text ilike ?', [$like]);
                } else {
                    $where->orWhere('categories', 'like', $like);
                }
            }
        });
    }

    private function safeCoverUrl(string $url): ?string
    {
        if (str_starts_with($url, '//')) {
            $url = 'https:' . $url;
        }

        if (str_starts_with($url, 'http://')) {
            $url = 'https://' . substr($url, 7);
        }

        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');
        $scheme = strtolower($parts['scheme'] ?? '');
        $allowedHosts = [
            'books.google.com',
            'covers.openlibrary.org',
            'books.googleusercontent.com',
        ];

        if ($scheme !== 'https' || !in_array($host, $allowedHosts, true)) {
            return null;
        }

        return $url;
    }
}
