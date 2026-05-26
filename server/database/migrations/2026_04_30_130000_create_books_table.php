<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->json('authors')->nullable();
            $table->string('publisher')->nullable();
            $table->string('published_date', 32)->nullable();
            $table->string('isbn_10', 20)->nullable()->index();
            $table->string('isbn_13', 20)->nullable()->index();
            $table->string('language', 8)->nullable();
            $table->unsignedInteger('page_count')->nullable();
            $table->json('categories')->nullable();
            $table->text('description')->nullable();
            $table->string('thumbnail')->nullable();
            $table->string('preview_link')->nullable();
            $table->string('type', 32)->default('textbook')->index();
            $table->string('source', 32)->default('manual')->index();
            $table->string('external_id')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['source', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
