<?php

namespace App\Http\Controllers;

use App\Enums\JobStatus;
use App\Http\Requests\Jobs\StoreJobRequest;
use App\Http\Requests\Jobs\UpdateJobRequest;
use App\Http\Resources\JobResource;
use App\Models\Job;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class JobController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Job::class);

        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:'.implode(',', array_column(JobStatus::cases(), 'value'))],
            'q' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $jobs = Job::query()
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['q'] ?? null, fn ($query, $term) => $query->whereRaw(
                "search_vector @@ plainto_tsquery('english', ?)", [$term]
            ))
            ->latest()
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return JobResource::collection($jobs);
    }

    public function store(StoreJobRequest $request): JsonResponse
    {
        $job = Job::create($request->validated());

        return JobResource::make($job)->response()->setStatusCode(201);
    }

    public function show(Job $job): JobResource
    {
        $this->authorize('view', $job);

        return JobResource::make($job);
    }

    public function update(UpdateJobRequest $request, Job $job): JobResource
    {
        $job->update($request->validated());

        return JobResource::make($job);
    }

    public function destroy(Job $job): JsonResponse
    {
        $this->authorize('delete', $job);

        $job->delete();

        return response()->json(status: 204);
    }

    public function publish(Job $job): JobResource
    {
        $this->authorize('update', $job);

        $job->update(['status' => JobStatus::Published]);

        return JobResource::make($job);
    }

    public function close(Job $job): JobResource
    {
        $this->authorize('update', $job);

        $job->update(['status' => JobStatus::Closed]);

        return JobResource::make($job);
    }
}
