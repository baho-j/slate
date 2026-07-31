<?php

namespace App\Http\Controllers;

use App\Actions\SubmitApplication;
use App\Enums\JobStatus;
use App\Http\Requests\Applications\ApplyToJobRequest;
use App\Models\Job;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Http\JsonResponse;

class PublicApplicationController extends Controller
{
    public function store(ApplyToJobRequest $request, SubmitApplication $submit, Organization $organization, string $job): JsonResponse
    {
        $publishedJob = Job::query()
            ->withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $organization->id)
            ->where('status', JobStatus::Published)
            ->findOrFail($job);

        $submit->handle($publishedJob, $request->validated());

        return response()->json(['message' => 'Your application has been submitted.'], 201);
    }
}
