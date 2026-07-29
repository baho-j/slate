<?php

use App\Enums\JobStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('department')->nullable();
            $table->string('location')->nullable();
            $table->string('employment_type');
            $table->unsignedInteger('salary_min')->nullable();
            $table->unsignedInteger('salary_max')->nullable();
            $table->string('currency', 3)->nullable();
            $table->string('status')->default(JobStatus::Draft->value);
            $table->date('closing_date')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index('status');
            $table->index(['organization_id', 'status']);
        });

        DB::statement(<<<'SQL'
            ALTER TABLE jobs ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(department, '')), 'B') ||
                setweight(to_tsvector('english', coalesce(description, '')), 'C')
            ) STORED
        SQL);

        DB::statement('CREATE INDEX jobs_search_vector_index ON jobs USING GIN (search_vector)');
    }

    public function down(): void
    {
        Schema::dropIfExists('jobs');
    }
};
