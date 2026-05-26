<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('criterion_id')->constrained('criteria')->cascadeOnDelete();
            $table->decimal('value', 4, 2);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['assessment_id', 'criterion_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scores');
    }
};
