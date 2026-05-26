<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    // GET /admin/users  ?role=&q=
    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $q = $request->string('q')->toString();
        $role = $request->string('role')->toString();

        $users = User::query()
            ->when($role, fn ($w) => $w->where('role', $role))
            ->when($q, function ($w) use ($q) {
                $like = '%' . $q . '%';
                $w->where(function ($x) use ($like) {
                    $x->where('name', 'ilike', $like)
                      ->orWhere('email', 'ilike', $like);
                });
            })
            ->latest('id')
            ->paginate(50);

        return response()->json($users);
    }

    // GET /admin/sellers — convenience: only sellers.
    public function sellers(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $users = User::query()
            ->where('role', Role::Seller->value)
            ->withCount('sellerBooks')
            ->latest('id')
            ->paginate(50);

        return response()->json($users);
    }

    // GET /admin/users/{user}
    public function show(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($request);
        return response()->json(['data' => new UserResource($user)]);
    }

    // PATCH /admin/users/{user}
    public function update(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:200', 'unique:users,email,' . $user->id],
            'role' => ['sometimes', 'string', 'in:' . implode(',', array_column(Role::cases(), 'value'))],
            'password' => ['sometimes', 'nullable', 'string', 'min:6'],
        ]);

        if (array_key_exists('password', $data) && $data['password']) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json(['data' => new UserResource($user->fresh())]);
    }

    // DELETE /admin/users/{user}
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($request);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete yourself.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    private function ensureAdmin(Request $request): void
    {
        if (!$request->user()?->isAdmin()) {
            abort(403);
        }
    }
}
