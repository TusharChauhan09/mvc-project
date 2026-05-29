<?php

use App\Http\Controllers\Api\V1\AdminBookController;
use App\Http\Controllers\Api\V1\AdminOrderController;
use App\Http\Controllers\Api\V1\AdminUserController;
use App\Http\Controllers\Api\V1\AssessmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookController;
use App\Http\Controllers\Api\V1\CriterionController;
use App\Http\Controllers\Api\V1\InstitutionController;
use App\Http\Controllers\Api\V1\LibraryController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OAuthController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ReadabilityController;
use App\Http\Controllers\Api\V1\RoleRequestController;
use App\Http\Controllers\Api\V1\SellerBookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::middleware('throttle:auth')->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/login', [AuthController::class, 'login']);
        Route::get('auth/{provider}/redirect', [OAuthController::class, 'redirect'])
            ->whereIn('provider', ['google', 'github']);
        Route::get('auth/{provider}/callback', [OAuthController::class, 'callback'])
            ->whereIn('provider', ['google', 'github']);
    });

    Route::get('books/external/cover', [BookController::class, 'externalCover']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('me/library', [LibraryController::class, 'index']);
        Route::post('me/library', [LibraryController::class, 'store']);
        Route::patch('me/library/{book}', [LibraryController::class, 'update']);
        Route::delete('me/library/{book}', [LibraryController::class, 'destroy']);

        Route::get('books/external/search', [BookController::class, 'externalSearch']);
        Route::post('books/import', [BookController::class, 'import']);
        Route::get('books/{book}/assessments', [BookController::class, 'assessments']);
        Route::get('books/{book}/readability', [ReadabilityController::class, 'forBook']);
        Route::post('readability/score', [ReadabilityController::class, 'scoreText']);
        Route::apiResource('books', BookController::class);

        Route::apiResource('criteria', CriterionController::class)->parameters(['criteria' => 'criterion']);

        Route::post('assessments/{assessment}/submit', [AssessmentController::class, 'submit']);
        Route::apiResource('assessments', AssessmentController::class);

        Route::apiResource('institutions', InstitutionController::class);

        // Role requests — any user can request, admin decides.
        Route::get('me/role-requests', [RoleRequestController::class, 'mine']);
        Route::post('me/role-requests', [RoleRequestController::class, 'store']);

        // Seller — list / submit own books, view sales.
        Route::get('me/seller/books', [SellerBookController::class, 'index']);
        Route::get('me/seller/sales', [SellerBookController::class, 'sales']);
        Route::post('me/seller/books', [SellerBookController::class, 'store']);

        // Notifications — user inbox + admin broadcast.
        Route::get('me/notifications', [NotificationController::class, 'index']);
        Route::post('me/notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('me/notifications/{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('admin/notifications', [NotificationController::class, 'broadcast']);

        // Orders (Razorpay).
        Route::post('orders', [OrderController::class, 'store']);
        Route::post('orders/verify', [OrderController::class, 'verify']);
        Route::get('me/orders', [OrderController::class, 'mine']);

        // Admin moderation.
        Route::get('admin/role-requests', [RoleRequestController::class, 'index']);
        Route::patch('admin/role-requests/{roleRequest}', [RoleRequestController::class, 'update']);
        Route::get('admin/books', [AdminBookController::class, 'index']);
        Route::patch('admin/books/{book}/approve', [AdminBookController::class, 'approve']);
        Route::patch('admin/books/{book}/reject', [AdminBookController::class, 'reject']);
        Route::patch('admin/books/{book}', [AdminBookController::class, 'update']);
        Route::delete('admin/books/{book}', [AdminBookController::class, 'destroy']);

        // Admin user CRUD.
        Route::get('admin/stats', [AdminUserController::class, 'stats']);
        Route::get('admin/users', [AdminUserController::class, 'index']);
        Route::get('admin/sellers', [AdminUserController::class, 'sellers']);
        Route::get('admin/users/{user}', [AdminUserController::class, 'show']);
        Route::patch('admin/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('admin/users/{user}', [AdminUserController::class, 'destroy']);

        // Admin orders.
        Route::get('admin/orders', [AdminOrderController::class, 'index']);
        Route::get('admin/orders/{order}', [AdminOrderController::class, 'show']);
    });
});
