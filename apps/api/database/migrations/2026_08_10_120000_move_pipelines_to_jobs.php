<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pipelines', function (Blueprint $table) {
            $table->uuid('job_id')->nullable()->after('organization_id');
            $table->foreign('job_id')->references('id')->on('jobs')->cascadeOnDelete();
            $table->index('job_id');
        });

        DB::transaction(function () {
            foreach (DB::table('jobs')->orderBy('id')->cursor() as $job) {
                $this->giveJobItsOwnPipeline($job);
            }

            DB::table('pipelines')->whereNull('job_id')->delete();
        });

        Schema::table('pipelines', function (Blueprint $table) {
            $table->uuid('job_id')->nullable(false)->change();
            $table->unique('job_id');
        });
    }

    public function down(): void
    {
        DB::table('pipelines')->whereNotNull('job_id')->delete();

        Schema::table('pipelines', function (Blueprint $table) {
            $table->dropUnique(['job_id']);
            $table->dropForeign(['job_id']);
            $table->dropColumn('job_id');
        });
    }

    private function giveJobItsOwnPipeline(object $job): void
    {
        $source = DB::table('pipelines')
            ->where('organization_id', $job->organization_id)
            ->whereNull('job_id')
            ->orderBy('id')
            ->first();

        $stages = $source === null
            ? collect(self::DEFAULT_STAGES)
            : DB::table('pipeline_stages')->where('pipeline_id', $source->id)->orderBy('order')->get();

        $now = now();

        $pipelineId = DB::table('pipelines')->insertGetId([
            'job_id' => $job->id,
            'organization_id' => $job->organization_id,
            'name' => $source->name ?? 'Default',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        foreach ($stages as $stage) {
            $stage = (array) $stage;

            $cloneId = DB::table('pipeline_stages')->insertGetId([
                'pipeline_id' => $pipelineId,
                'name' => $stage['name'],
                'order' => $stage['order'],
                'is_terminal' => $stage['is_terminal'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if (isset($stage['id'])) {
                $this->repointJobRows($job->id, $stage['id'], $cloneId);
            }
        }
    }

    private function repointJobRows(string $jobId, int $from, int $to): void
    {
        DB::table('applications')
            ->where('job_id', $jobId)
            ->where('current_stage_id', $from)
            ->update(['current_stage_id' => $to]);

        foreach (['from_stage_id', 'to_stage_id'] as $column) {
            DB::table('application_status_history')
                ->whereIn('application_id', DB::table('applications')->where('job_id', $jobId)->select('id'))
                ->where($column, $from)
                ->update([$column => $to]);
        }
    }

    private const DEFAULT_STAGES = [
        ['name' => 'Applied', 'order' => 1, 'is_terminal' => false],
        ['name' => 'In Review', 'order' => 2, 'is_terminal' => false],
        ['name' => 'Interview', 'order' => 3, 'is_terminal' => false],
        ['name' => 'Offer', 'order' => 4, 'is_terminal' => false],
        ['name' => 'Hired', 'order' => 5, 'is_terminal' => true],
        ['name' => 'Rejected', 'order' => 6, 'is_terminal' => true],
    ];
};
