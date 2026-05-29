<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    // GET /me/notifications
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $items = UserNotification::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(50)
            ->get();

        $unread = UserNotification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data' => $items,
            'unread_count' => $unread,
        ]);
    }

    // POST /me/notifications/{notification}/read
    public function markRead(Request $request, UserNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403);
        }
        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }
        return response()->json(['data' => $notification]);
    }

    // POST /me/notifications/read-all
    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All marked read.']);
    }

    // POST /admin/notifications  — broadcast to all users.
    public function broadcast(Request $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:2000'],
            'type' => ['nullable', 'string', 'max:32'],
        ]);

        $now = now();
        $adminId = $request->user()->id;
        $count = 0;

        User::query()
            ->select('id')
            ->chunkById(500, function ($users) use ($data, $now, $adminId, &$count) {
                $rows = $users->map(fn ($u) => [
                    'user_id' => $u->id,
                    'title' => $data['title'],
                    'body' => $data['body'] ?? null,
                    'type' => $data['type'] ?? 'info',
                    'read_at' => null,
                    'created_by' => $adminId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();
                DB::table('user_notifications')->insert($rows);
                $count += count($rows);
            });

        return response()->json([
            'message' => "Notification sent to {$count} user(s).",
            'count' => $count,
        ], 201);
    }
}
