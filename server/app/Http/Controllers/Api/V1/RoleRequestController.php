<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\RoleRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleRequestController extends Controller
{
    // POST /me/role-requests
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'requested_role' => ['required', 'string', Rule::in(Role::requestableRoles())],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        $existing = RoleRequest::query()
            ->where('user_id', $user->id)
            ->where('requested_role', $data['requested_role'])
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json([
                'data' => $existing->load('user'),
                'message' => 'You already have a pending request for this role.',
            ], 200);
        }

        $req = RoleRequest::create([
            'user_id' => $user->id,
            'requested_role' => $data['requested_role'],
            'status' => 'pending',
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['data' => $req->load('user')], 201);
    }

    // GET /me/role-requests
    public function mine(Request $request): JsonResponse
    {
        $items = RoleRequest::query()
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->get();
        return response()->json(['data' => $items]);
    }

    // GET /admin/role-requests  (admin only)
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            abort(403);
        }
        $items = RoleRequest::query()
            ->with(['user', 'decider'])
            ->latest('id')
            ->paginate(50);
        return response()->json($items);
    }

    // PATCH /admin/role-requests/{request}
    public function update(Request $request, RoleRequest $roleRequest): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['approved', 'rejected'])],
            'decision_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($roleRequest->status !== 'pending') {
            return response()->json(['message' => 'Request already decided.'], 422);
        }

        $roleRequest->update([
            'status' => $data['status'],
            'decision_note' => $data['decision_note'] ?? null,
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ]);

        if ($data['status'] === 'approved') {
            User::where('id', $roleRequest->user_id)->update([
                'role' => $roleRequest->requested_role,
            ]);
        }

        return response()->json(['data' => $roleRequest->load(['user', 'decider'])]);
    }
}
