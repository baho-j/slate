<?php

namespace App\Http\Controllers;

use App\Enums\JobStatus;
use App\Http\Resources\PublicJobResource;
use App\Http\Resources\PublicOrganizationResource;
use App\Models\Job;
use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicCareersController extends Controller
{
    public function organization(Organization $organization): PublicOrganizationResource
    {
        return PublicOrganizationResource::make($organization);
    }

    public function jobs(Request $request, Organization $organization): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $jobs = $this->publishedJobs($organization)
            ->when($validated['q'] ?? null, fn ($query, $term) => $query->whereRaw(
                "search_vector @@ plainto_tsquery('english', ?)", [$term]
            ))
            ->latest()
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return PublicJobResource::collection($jobs);
    }

    public function job(Organization $organization, string $job): PublicJobResource
    {
        $found = $this->publishedJobs($organization)->findOrFail($job);

        return PublicJobResource::make($found);
    }

    /**
     * @return Builder<Job>
     */
    private function publishedJobs(Organization $organization): Builder
    {
        return Job::query()
            ->withoutGlobalScope(BelongsToOrganization::class)
            ->where('organization_id', $organization->id)
            ->where('status', JobStatus::Published);
    }
}
