<?php

namespace App\Http\Controllers;

use App\Http\Requests\Interviews\StoreInterviewRequest;
use App\Http\Requests\Interviews\UpdateInterviewRequest;
use App\Http\Resources\InterviewResource;
use App\Models\Application;
use App\Models\Interview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InterviewController extends Controller
{
    public function store(StoreInterviewRequest $request, Application $application): InterviewResource
    {
        $interview = $application->interviews()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return InterviewResource::make($interview->load(['interviewer', 'application.candidate', 'application.job']));
    }

    public function update(UpdateInterviewRequest $request, Interview $interview): InterviewResource
    {
        $interview->update($request->validated());

        return InterviewResource::make($interview->load(['interviewer', 'application.candidate', 'application.job']));
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $interviews = Interview::query()
            ->assignedTo($request->user())
            ->with(['application.candidate', 'application.job'])
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->orderBy('scheduled_at')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return InterviewResource::collection($interviews);
    }
}
