<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Book;
use App\Models\Order;
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

        // Attach per-seller paid-order units + revenue (one grouped query, no N+1).
        $ids = $users->getCollection()->pluck('id');
        $sales = Order::query()
            ->join('books', 'books.id', '=', 'orders.book_id')
            ->where('orders.status', 'paid')
            ->whereIn('books.added_by', $ids)
            ->groupBy('books.added_by')
            ->selectRaw('books.added_by as seller_id, count(*) as units, sum(orders.amount) as revenue')
            ->get()
            ->keyBy('seller_id');

        $users->getCollection()->transform(function (User $u) use ($sales) {
            $row = $sales->get($u->id);
            $u->units_sold = $row ? (int) $row->units : 0;
            $u->revenue_paise = $row ? (int) $row->revenue : 0;
            return $u;
        });

        return response()->json($users);
    }

    // GET /admin/stats — high-level totals for the admin dashboard.
    public function stats(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $revenue = (int) Order::where('status', 'paid')->sum('amount');

        return response()->json([
            'data' => [
                'users_total' => (int) User::count(),
                'sellers_total' => (int) User::where('role', Role::Seller->value)->count(),
                'books_total' => (int) Book::count(),
                'books_pending' => (int) Book::where('status', 'pending')->count(),
                'orders_total' => (int) Order::count(),
                'orders_paid' => (int) Order::where('status', 'paid')->count(),
                'revenue_paise' => $revenue,
            ],
        ]);
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
