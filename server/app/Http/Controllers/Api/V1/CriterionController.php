<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Criteria\StoreCriterionRequest;
use App\Http\Resources\CriterionResource;
use App\Models\Criterion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CriterionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Criterion::query()
            ->when($request->filled('institution_id'), fn ($q) => $q->where('institution_id', $request->integer('institution_id')))
            ->when($request->boolean('only_active', true), fn ($q) => $q->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
        return CriterionResource::collection($items);
    }

    public function store(StoreCriterionRequest $request): JsonResponse
    {
        $criterion = Criterion::create($request->validated());
        return response()->json(['data' => new CriterionResource($criterion)], 201);
    }

    public function show(Criterion $criterion): CriterionResource
    {
        return new CriterionResource($criterion);
    }

    public function update(StoreCriterionRequest $request, Criterion $criterion): CriterionResource
    {
        $criterion->update($request->validated());
        return new CriterionResource($criterion);
    }

    public function destroy(Criterion $criterion): JsonResponse
    {
        $this->authorize('delete', $criterion);
        $criterion->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
