<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Book;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    // POST /orders
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
            'shipping.name' => ['required', 'string', 'max:120'],
            'shipping.phone' => ['required', 'string', 'max:32'],
            'shipping.line1' => ['required', 'string', 'max:200'],
            'shipping.line2' => ['nullable', 'string', 'max:200'],
            'shipping.city' => ['required', 'string', 'max:96'],
            'shipping.state' => ['required', 'string', 'max:96'],
            'shipping.postal' => ['required', 'string', 'max:16'],
            'shipping.country' => ['nullable', 'string', 'max:4'],
        ]);

        $book = Book::findOrFail($data['book_id']);
        $amount = (int) ($book->price_paise ?? 49900);
        $currency = (string) config('services.razorpay.currency', 'INR');

        $order = Order::create([
            'user_id' => $request->user()->id,
            'book_id' => $book->id,
            'amount' => $amount,
            'currency' => $currency,
            'status' => 'created',
            'ship_name' => $data['shipping']['name'],
            'ship_phone' => $data['shipping']['phone'],
            'ship_line1' => $data['shipping']['line1'],
            'ship_line2' => $data['shipping']['line2'] ?? null,
            'ship_city' => $data['shipping']['city'],
            'ship_state' => $data['shipping']['state'],
            'ship_postal' => $data['shipping']['postal'],
            'ship_country' => $data['shipping']['country'] ?? 'IN',
        ]);

        $keyId = config('services.razorpay.key_id');
        $keySecret = config('services.razorpay.key_secret');

        if (!$keyId || !$keySecret) {
            return response()->json([
                'message' => 'Razorpay not configured on server.',
            ], 500);
        }

        $resp = Http::withBasicAuth($keyId, $keySecret)
            ->acceptJson()
            ->asJson()
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => $amount,
                'currency' => $currency,
                'receipt' => 'order_' . $order->id . '_' . substr((string) microtime(true), -6),
                'notes' => [
                    'order_id' => (string) $order->id,
                    'book_id' => (string) $book->id,
                    'user_id' => (string) $request->user()->id,
                ],
            ]);

        if (!$resp->successful()) {
            Log::warning('Razorpay order create failed', ['body' => $resp->body()]);
            $order->update(['status' => 'failed']);
            return response()->json([
                'message' => 'Failed to create Razorpay order.',
                'error' => $resp->json('error.description') ?? $resp->body(),
            ], 502);
        }

        $rp = $resp->json();
        $order->update(['razorpay_order_id' => $rp['id'] ?? null]);

        return response()->json([
            'data' => new OrderResource($order->fresh()->load('book')),
            'razorpay' => [
                'key_id' => $keyId,
                'order_id' => $rp['id'] ?? null,
                'amount' => $amount,
                'currency' => $currency,
            ],
        ], 201);
    }

    // POST /orders/verify
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'razorpay_order_id' => ['required', 'string'],
            'razorpay_payment_id' => ['required', 'string'],
            'razorpay_signature' => ['required', 'string'],
        ]);

        $order = Order::where('razorpay_order_id', $data['razorpay_order_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $secret = config('services.razorpay.key_secret');
        $expected = hash_hmac(
            'sha256',
            $data['razorpay_order_id'] . '|' . $data['razorpay_payment_id'],
            (string) $secret
        );

        if (!hash_equals($expected, $data['razorpay_signature'])) {
            $order->update(['status' => 'failed']);
            return response()->json(['message' => 'Signature mismatch.'], 400);
        }

        $order->update([
            'razorpay_payment_id' => $data['razorpay_payment_id'],
            'razorpay_signature' => $data['razorpay_signature'],
            'status' => 'paid',
        ]);

        return response()->json([
            'message' => 'Payment verified.',
            'data' => new OrderResource($order->fresh()->load('book')),
        ]);
    }

    // GET /me/orders
    public function mine(Request $request): JsonResponse
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->with('book')
            ->latest('id')
            ->paginate(50);

        return response()->json($orders->setCollection(
            $orders->getCollection()->map(fn ($o) => new OrderResource($o))
        ));
    }
}
