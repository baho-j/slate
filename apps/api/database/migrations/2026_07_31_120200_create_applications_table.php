<?php

use App\Enums\ApplicationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('job_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('candidate_id')->constrained()->cascadeOnDelete();
            $table->foreignId('current_stage_id')->nullable()->constrained('pipeline_stages')->nullOnDelete();
            $table->string('status')->default(ApplicationStatus::Applied->value);
            $table->string('eligibility')->default('manual');
            $table->unsignedTinyInteger('match_score')->nullable();
            $table->text('cover_note')->nullable();
            $table->timestamps();

            $table->unique(['job_id', 'candidate_id']);
            $table->index(['job_id', 'status']);
            $table->index('candidate_id');
            $table->index('current_stage_id');
            $table->index('organization_id');
        });

        DB::statement(<<<'SQL'
            ALTER TABLE applications ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                to_tsvector('english', coalesce(cover_note, ''))
            ) STORED
        SQL);

        DB::statement('CREATE INDEX applications_search_vector_index ON applications USING GIN (search_vector)');
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
