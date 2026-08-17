<?php

namespace App\Services\Analytics;

use App\Models\Job;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * Headline counts for an org. Each is a single indexed aggregate — none scan
     * more rows as history accumulates beyond the counted set.
     *
     * @return array{open_jobs: int, applications: int, interviews_scheduled: int, since: string}
     */
    public function overview(int $organizationId, Carbon $since): array
    {
        $openJobs = Job::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->where('status', 'published')
            ->count();

        $applications = DB::table('applications')
            ->where('organization_id', $organizationId)
            ->where('created_at', '>=', $since)
            ->count();

        $interviews = DB::table('interviews')
            ->where('organization_id', $organizationId)
            ->where('status', 'scheduled')
            ->count();

        return [
            'open_jobs' => $openJobs,
            'applications' => $applications,
            'interviews_scheduled' => $interviews,
            'since' => $since->toIso8601String(),
        ];
    }

    /**
     * Funnel for one job: how many applications currently sit in each stage, in
     * pipeline order, with the conversion rate from the previous stage.
     *
     * @return array<int, array{stage_id: int, name: string, is_terminal: bool, count: int, conversion_rate: float|null}>
     */
    public function funnel(Job $job): array
    {
        $rows = DB::select(<<<'SQL'
            SELECT s.id AS stage_id, s.name, s.is_terminal, s."order",
                   COUNT(a.id) AS count
            FROM pipeline_stages s
            JOIN pipelines p ON p.id = s.pipeline_id
            LEFT JOIN applications a ON a.current_stage_id = s.id
            WHERE p.job_id = ?
            GROUP BY s.id, s.name, s.is_terminal, s."order"
            ORDER BY s."order"
        SQL, [$job->id]);

        $previous = null;

        return array_map(function ($row) use (&$previous) {
            $count = (int) $row->count;
            $conversion = ($previous === null || $previous === 0) ? null : round($count / $previous, 4);
            $previous = $count;

            return [
                'stage_id' => (int) $row->stage_id,
                'name' => $row->name,
                'is_terminal' => (bool) $row->is_terminal,
                'count' => $count,
                'conversion_rate' => $conversion,
            ];
        }, $rows);
    }

    /**
     * Average and median time (in hours) an application spends in each stage of a
     * job, derived from the status history. Uses LEAD() to pair each stage entry
     * with the next transition — a single windowed aggregate, no per-row PHP.
     *
     * @return array<int, array{stage_id: int, name: string, avg_hours: float|null, median_hours: float|null, samples: int}>
     */
    public function timeInStage(Job $job): array
    {
        $rows = DB::select(<<<'SQL'
            WITH transitions AS (
                SELECT h.application_id,
                       h.to_stage_id AS stage_id,
                       h.created_at AS entered_at,
                       LEAD(h.created_at) OVER (
                           PARTITION BY h.application_id ORDER BY h.created_at, h.id
                       ) AS left_at
                FROM application_status_history h
                JOIN applications a ON a.id = h.application_id
                WHERE a.job_id = ? AND h.to_stage_id IS NOT NULL
            ),
            durations AS (
                SELECT stage_id,
                       EXTRACT(EPOCH FROM (left_at - entered_at)) / 3600.0 AS hours
                FROM transitions
                WHERE left_at IS NOT NULL
            )
            SELECT s.id AS stage_id, s.name, s."order",
                   AVG(d.hours) AS avg_hours,
                   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY d.hours) AS median_hours,
                   COUNT(d.hours) AS samples
            FROM pipeline_stages s
            JOIN pipelines p ON p.id = s.pipeline_id
            LEFT JOIN durations d ON d.stage_id = s.id
            WHERE p.job_id = ?
            GROUP BY s.id, s.name, s."order"
            ORDER BY s."order"
        SQL, [$job->id, $job->id]);

        return array_map(fn ($row) => [
            'stage_id' => (int) $row->stage_id,
            'name' => $row->name,
            'avg_hours' => $row->avg_hours === null ? null : round((float) $row->avg_hours, 2),
            'median_hours' => $row->median_hours === null ? null : round((float) $row->median_hours, 2),
            'samples' => (int) $row->samples,
        ], $rows);
    }
}
