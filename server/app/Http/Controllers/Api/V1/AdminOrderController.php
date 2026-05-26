<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    // GET /admin/orders  ?status=&q=
    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $status = $request->string('status')->toString();
        $q = $request->string('q')->toString();

        $orders = Order::query()
            ->with(['book', 'user'])
            ->when($status, fn ($w) => $w->where('status', $status))
            ->when($q, function ($w) use ($q) {
                $like = '%' . $q . '%';
                $w->where(function ($x) use ($like) {
                    $x->where('razorpay_order_id', 'ilike', $like)
                      ->orWhere('razorpay_payment_id', 'ilike', $like)
                      ->orWhere('ship_name', 'ilike', $like)
                      ->orWhere('ship_phone', 'ilike', $like);
                });
            })
            ->latest('id')
            ->paginate(50);

        return response()->json($orders->setCollection(
            $orders->getCollection()->map(fn ($o) => new OrderResource($o))
        ));
    }

    // GET /admin/orders/{order}
    public function show(Request $request, Order $order): JsonResponse
    {
        $this->ensureAdmin($request);
        $order->load(['book', 'user']);
        return response()->json(['data' => new OrderResource($order)]);
    }

    private function ensureAdmin(Request $request): void
    {
        if (!$request->user()?->isAdmin()) {
            abort(403);
        }
    }
}
