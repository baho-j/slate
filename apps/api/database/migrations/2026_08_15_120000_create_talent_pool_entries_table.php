<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('talent_pool_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('candidate_id')->constrained()->cascadeOnDelete();
            $table->jsonb('tags')->default('[]');
            $table->text('note')->nullable();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['organization_id', 'candidate_id']);
        });

        // Full-text search over candidate details for the pool (reuses the #60 approach).
        // Email is split on @ and . so its parts are searchable as separate tokens.
        DB::statement(<<<'SQL'
            ALTER TABLE candidates ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
                setweight(to_tsvector('english', translate(coalesce(email, ''), '@.', '  ')), 'B')
            ) STORED
        SQL);

        DB::statement('CREATE INDEX candidates_search_vector_index ON candidates USING GIN (search_vector)');
    }

    public function down(): void
    {
        Schema::dropIfExists('talent_pool_entries');

        DB::statement('DROP INDEX IF EXISTS candidates_search_vector_index');
        DB::statement('ALTER TABLE candidates DROP COLUMN IF EXISTS search_vector');
    }
};
