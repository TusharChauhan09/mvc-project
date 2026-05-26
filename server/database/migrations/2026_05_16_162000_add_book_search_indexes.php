<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX IF NOT EXISTS books_title_trgm_idx ON books USING gin (title gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS books_subtitle_trgm_idx ON books USING gin (subtitle gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS books_categories_trgm_idx ON books USING gin ((categories::text) gin_trgm_ops)');
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS books_categories_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS books_subtitle_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS books_title_trgm_idx');
    }
};
