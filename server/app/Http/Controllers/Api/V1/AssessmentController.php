<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AssessmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assessments\StoreAssessmentRequest;
use App\Http\Requests\Assessments\UpdateAssessmentRequest;
use App\Http\Resources\AssessmentResource;
use App\Models\Assessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AssessmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $items = Assessment::query()
            ->with(['book', 'user'])
            ->when($request->filled('book_id'), fn($q) => $q->where('book_id', $request->integer('book_id')))
            ->when($request->filled('status'), fn($q) => $q->where('status', $request->string('status')))
            ->when(
                !$user->isAdmin(),
                fn($q) => $q->where(function ($w) use ($user) {
                    $w->where('user_id', $user->id)
                        ->orWhere('status', AssessmentStatus::Submitted->value);
                })
            )
            ->latest('id')
            ->simplePaginate((int) $request->integer('per_page', 15));
        return AssessmentResource::collection($items);
    }

    public function store(StoreAssessmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $assessment = DB::transaction(function () use ($data, $user) {
            $assessment = Assessment::create([
                'book_id' => $data['book_id'],
                'user_id' => $user->id,
                'institution_id' => $user->institution_id,
                'status' => AssessmentStatus::Draft->value,
                'summary' => $data['summary'] ?? null,
                'recommendation' => $data['recommendation'] ?? null,
            ]);
            $this->syncScores($assessment, $data['scores'] ?? []);
            $assessment->recomputeOverall();
            $assessment->save();
            return $assessment;
        });

        $assessment->load(['book', 'user', 'scores.criterion']);
        return response()->json(['data' => new AssessmentResource($assessment)], 201);
    }

    public function show(Assessment $assessment): AssessmentResource
    {
        $this->authorize('view', $assessment);
        $assessment->load(['book', 'user', 'scores.criterion']);
        return new AssessmentResource($assessment);
    }

    public function update(UpdateAssessmentRequest $request, Assessment $assessment): AssessmentResource
    {
        $this->authorize('update', $assessment);
        $data = $request->validated();

        DB::transaction(function () use ($data, $assessment) {
            $assessment->fill([
                'summary' => $data['summary'] ?? $assessment->summary,
                'recommendation' => $data['recommendation'] ?? $assessment->recommendation,
            ]);
            if (array_key_exists('scores', $data)) {
                $this->syncScores($assessment, $data['scores']);
            }
            $assessment->recomputeOverall();
            $assessment->save();
        });

        $assessment->load(['book', 'user', 'scores.criterion']);
        return new AssessmentResource($assessment);
    }

    public function destroy(Assessment $assessment): JsonResponse
    {
        $this->authorize('delete', $assessment);
        $assessment->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    public function submit(Request $request, Assessment $assessment): AssessmentResource
    {
        $this->authorize('submit', $assessment);

        if ($assessment->scores()->count() === 0) {
            abort(422, 'Cannot submit without at least one score.');
        }

        $assessment->recomputeOverall();
        $assessment->status = AssessmentStatus::Submitted;
        $assessment->submitted_at = now();
        $assessment->save();

        $assessment->load(['book', 'user', 'scores.criterion']);
        return new AssessmentResource($assessment);
    }

    private function syncScores(Assessment $assessment, array $scores): void
    {
        $assessment->scores()->delete();
        foreach ($scores as $row) {
            $assessment->scores()->create([
                'criterion_id' => $row['criterion_id'],
                'value' => $row['value'],
                'note' => $row['note'] ?? null,
            ]);
        }
    }
}
