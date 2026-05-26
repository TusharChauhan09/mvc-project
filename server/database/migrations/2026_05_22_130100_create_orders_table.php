<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('amount'); // paise
            $table->string('currency', 8)->default('INR');
            $table->string('razorpay_order_id')->nullable()->index();
            $table->string('razorpay_payment_id')->nullable()->index();
            $table->string('razorpay_signature')->nullable();
            $table->string('status', 16)->default('created'); // created|paid|failed
            // Shipping snapshot at purchase time.
            $table->string('ship_name');
            $table->string('ship_phone', 32);
            $table->string('ship_line1');
            $table->string('ship_line2')->nullable();
            $table->string('ship_city', 96);
            $table->string('ship_state', 96);
            $table->string('ship_postal', 16);
            $table->string('ship_country', 4)->default('IN');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
