<?php

namespace App\Http\Controllers;

use App\Http\Requests\Fields\ReplaceApplicationFieldsRequest;
use App\Http\Resources\ApplicationFieldResource;
use App\Models\Job;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ApplicationFieldController extends Controller
{
    public function index(Job $job): AnonymousResourceCollection
    {
        $this->authorize('update', $job);

        return ApplicationFieldResource::collection($job->applicationFields);
    }

    public function replace(ReplaceApplicationFieldsRequest $request, Job $job): AnonymousResourceCollection
    {
        $fields = $request->validated('fields');

        DB::transaction(function () use ($job, $fields) {
            $job->applicationFields()->delete();

            foreach ($fields as $field) {
                $job->applicationFields()->create($field);
            }
        });

        return ApplicationFieldResource::collection($job->applicationFields()->get());
    }
}
