<?php

namespace App\Http\Controllers;

use App\Actions\MoveApplicationStage;
use App\Enums\ApplicationStatus;
use App\Enums\Eligibility;
use App\Enums\UserRole;
use App\Http\Requests\Applications\MoveApplicationStageRequest;
use App\Http\Resources\ApplicationDetailResource;
use App\Http\Resources\ApplicationResource;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\Job;
use App\Models\PipelineStage;
use App\Models\User;
use App\Services\CvStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApplicationController extends Controller
{
    public function index(Request $request, Job $job): AnonymousResourceCollection
    {
        $this->authorize('viewAnyForJob', [Application::class, $job]);

        $validated = $request->validate([
            'stage' => ['sometimes', 'integer'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', array_column(ApplicationStatus::cases(), 'value'))],
            'eligibility' => ['sometimes', 'string', 'in:'.implode(',', array_column(Eligibility::cases(), 'value'))],
            'q' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $applications = $job->applications()
            ->with(['candidate', 'currentStage'])
            ->when($validated['stage'] ?? null, fn ($query, $stage) => $query->where('current_stage_id', $stage))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['eligibility'] ?? null, fn ($query, $eligibility) => $query->where('eligibility', $eligibility))
            ->when($validated['q'] ?? null, fn ($query, $term) => $query->whereRaw(
                "search_vector @@ plainto_tsquery('english', ?)", [$term]
            ))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->cursorPaginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return ApplicationResource::collection($applications);
    }

    public function show(Request $request, string $application): ApplicationDetailResource
    {
        $found = $this->resolveApplication($application);

        $this->authorize('view', $found);

        $found->load($this->detailRelations($request->user()));

        return ApplicationDetailResource::make($found);
    }

    public function moveStage(
        MoveApplicationStageRequest $request,
        MoveApplicationStage $move,
        Application $application,
    ): ApplicationDetailResource {
        $this->authorize('updateStage', $application);

        $toStage = PipelineStage::findOrFail($request->integer('stage_id'));
        $move->handle($application, $toStage, $request->input('note'));

        $application->load($this->detailRelations($request->user()));

        return ApplicationDetailResource::make($application);
    }

    /**
     * @return array<int, string>
     */
    private function detailRelations(User $user): array
    {
        $relations = ['candidate', 'currentStage', 'documents', 'statusHistory.toStage', 'interviews.interviewer'];

        if ($user->isSuperAdmin() || $user->hasRole(UserRole::HrManager, UserRole::Recruiter)) {
            $relations[] = 'interviews.evaluation.author';
            $relations[] = 'candidate.talentPoolEntry';
        }

        return $relations;
    }

    public function documentUrl(CvStorage $cv, string $application, string $document): JsonResponse
    {
        $found = $this->resolveApplication($application);

        $this->authorize('view', $found);

        $doc = ApplicationDocument::where('application_id', $found->id)->findOrFail($document);

        return response()->json([
            'url' => $cv->downloadUrl($doc->blob_path),
        ]);
    }

    private function resolveApplication(string $id): Application
    {
        $query = Application::query()->with('candidate');

        // Candidates have no org, so the org scope would hide their own application; the policy gates ownership instead.
        if (auth()->user()?->isCandidate()) {
            $query->withoutGlobalScopes();
        }

        return $query->findOrFail($id);
    }
}
