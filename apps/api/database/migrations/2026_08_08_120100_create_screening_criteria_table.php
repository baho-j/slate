<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('screening_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('job_id')->constrained()->cascadeOnDelete();
            $table->string('field_key');
            $table->string('operator');
            $table->jsonb('value')->nullable();
            $table->string('mode');
            $table->unsignedInteger('weight')->nullable();
            $table->timestamps();

            $table->index('job_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('screening_criteria');
    }
};
