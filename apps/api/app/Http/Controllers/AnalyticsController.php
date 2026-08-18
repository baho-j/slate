<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Services\Analytics\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics) {}

    public function overview(Request $request): JsonResponse
    {
        $this->authorize('viewAnalytics', Job::class);

        $validated = $request->validate([
            'days' => ['sometimes', 'integer', 'min:1', 'max:365'],
        ]);

        $since = Carbon::now()->subDays($validated['days'] ?? 30)->startOfDay();

        return response()->json([
            'data' => $this->analytics->overview($request->user()->organization_id, $since),
        ]);
    }

    public function job(Job $job): JsonResponse
    {
        $this->authorize('viewAnalytics', $job);

        return response()->json([
            'data' => [
                'job' => ['id' => $job->id, 'title' => $job->title],
                'funnel' => $this->analytics->funnel($job),
                'time_in_stage' => $this->analytics->timeInStage($job),
            ],
        ]);
    }
}
