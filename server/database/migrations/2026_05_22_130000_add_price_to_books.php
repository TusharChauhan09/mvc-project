<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            // Stored in paise (₹1 = 100 paise). Default ₹499.
            $table->unsignedInteger('price_paise')->default(49900)->after('page_count');
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropColumn('price_paise');
        });
    }
};
