<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Services\Books\GutendexService;
use App\Services\Readability\ReadabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadabilityController extends Controller
{
    public function __construct(
        private readonly ReadabilityService $readability,
        private readonly GutendexService $gutendex,
    ) {}

    public function scoreText(Request $request): JsonResponse
    {
        $data = $request->validate([
            'text' => ['required', 'string', 'min:30', 'max:200000'],
        ]);

        return response()->json([
            'metrics' => $this->readability->analyze($data['text']),
        ]);
    }

    public function forBook(Book $book, Request $request): JsonResponse
    {
        $sample = null;
        $source = null;

        $gutendexId = $request->query('gutendex_id');
        if ($gutendexId) {
            $gut = $this->gutendex->findById($gutendexId);
            if ($gut && ! empty($gut['text_url'])) {
                $sample = $this->gutendex->fetchSampleText($gut['text_url']);
                $source = 'gutendex:'.$gut['external_id'];
            }
        }

        if (! $sample) {
            $matches = $this->gutendex->search($book->title, 1);
            if (! empty($matches[0]['text_url'])) {
                $sample = $this->gutendex->fetchSampleText($matches[0]['text_url']);
                $source = 'gutendex:'.$matches[0]['external_id'];
            }
        }

        if (! $sample) {
            $sample = (string) $book->description;
            $source = 'book.description';
        }

        if (trim($sample) === '') {
            return response()->json([
                'message' => 'No text available to analyze. Provide ?gutendex_id= or ensure book.description is set.',
            ], 422);
        }

        return response()->json([
            'book_id' => $book->id,
            'sample_source' => $source,
            'sample_chars' => strlen($sample),
            'metrics' => $this->readability->analyze($sample),
        ]);
    }
}
