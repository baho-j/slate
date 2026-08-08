<?php

namespace App\Http\Controllers;

use App\Http\Requests\Criteria\ReplaceScreeningCriteriaRequest;
use App\Http\Resources\ScreeningCriterionResource;
use App\Models\Job;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ScreeningCriterionController extends Controller
{
    public function index(Job $job): AnonymousResourceCollection
    {
        $this->authorize('update', $job);

        return ScreeningCriterionResource::collection($job->screeningCriteria);
    }

    public function replace(ReplaceScreeningCriteriaRequest $request, Job $job): AnonymousResourceCollection
    {
        $criteria = $request->validated('criteria');

        DB::transaction(function () use ($job, $criteria) {
            $job->screeningCriteria()->delete();

            foreach ($criteria as $rule) {
                $job->screeningCriteria()->create($rule);
            }
        });

        return ScreeningCriterionResource::collection($job->screeningCriteria()->get());
    }
}
