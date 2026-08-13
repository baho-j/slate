<?php

namespace App\Http\Controllers;

use App\Enums\InterviewStatus;
use App\Http\Requests\Interviews\StoreEvaluationRequest;
use App\Http\Resources\InterviewEvaluationResource;
use App\Models\Interview;
use Illuminate\Support\Facades\DB;

class InterviewEvaluationController extends Controller
{
    public function store(StoreEvaluationRequest $request, Interview $interview): InterviewEvaluationResource
    {
        $evaluation = DB::transaction(function () use ($request, $interview) {
            $evaluation = $interview->evaluation()->create([
                ...$request->validated(),
                'created_by' => $request->user()->id,
            ]);

            $interview->update(['status' => InterviewStatus::Completed]);

            return $evaluation;
        });

        return InterviewEvaluationResource::make($evaluation->load('author'));
    }
}
