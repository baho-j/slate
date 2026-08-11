<?php

namespace App\Http\Controllers;

use App\Actions\EnsureDefaultPipeline;
use App\Actions\ReplacePipelineStages;
use App\Http\Requests\Pipelines\ReplacePipelineRequest;
use App\Http\Resources\PipelineResource;
use App\Models\Job;
use App\Models\Pipeline;
use Illuminate\Http\JsonResponse;

class PipelineController extends Controller
{
    public function __construct(
        private readonly EnsureDefaultPipeline $pipelines,
        private readonly ReplacePipelineStages $replace,
    ) {}

    public function show(Job $job): JsonResponse
    {
        $this->authorize('view', $job);

        return PipelineResource::make($this->withCounts($job))->response()->setStatusCode(200);
    }

    public function update(ReplacePipelineRequest $request, Job $job): JsonResponse
    {
        $this->replace->handle(
            $this->pipelines->forJob($job),
            $request->validated('stages'),
            $request->validated('name'),
        );

        return PipelineResource::make($this->withCounts($job))->response()->setStatusCode(200);
    }

    private function withCounts(Job $job): Pipeline
    {
        $pipeline = $this->pipelines->forJob($job);
        $pipeline->load(['stages' => fn ($stages) => $stages->withCount('applications')]);

        return $pipeline;
    }
}
