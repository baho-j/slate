<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('application_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('job_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->string('key');
            $table->string('type');
            $table->boolean('required')->default(false);
            $table->jsonb('options')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->unique(['job_id', 'key']);
            $table->index(['job_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_fields');
    }
};
