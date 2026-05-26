<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->string('status', 16)->default('approved')->index()->after('source');
            $table->string('cover_image_path')->nullable()->after('thumbnail');
            $table->string('review_note')->nullable()->after('cover_image_path');
        });

        // All pre-existing books are considered approved.
        DB::table('books')->update(['status' => 'approved']);
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropColumn(['status', 'cover_image_path', 'review_note']);
        });
    }
};
