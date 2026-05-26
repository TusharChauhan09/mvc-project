<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InstitutionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Institution::orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:institutions,slug'],
            'country' => ['nullable', 'string', 'size:2'],
            'description' => ['nullable', 'string'],
        ]);
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']).'-'.Str::random(6);
        $institution = Institution::create($data);
        return response()->json(['data' => $institution], 201);
    }

    public function show(Institution $institution): JsonResponse
    {
        return response()->json(['data' => $institution]);
    }

    public function update(Request $request, Institution $institution): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:institutions,slug,'.$institution->id],
            'country' => ['nullable', 'string', 'size:2'],
            'description' => ['nullable', 'string'],
        ]);
        $institution->update($data);
        return response()->json(['data' => $institution]);
    }

    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $institution->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
