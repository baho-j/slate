<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Resources\UserResource;
use App\Models\Interview;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InterviewerController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Interview::class);

        $interviewers = User::query()
            ->where('organization_id', $request->user()->organization_id)
            ->whereIn('role', [UserRole::Interviewer, UserRole::Recruiter, UserRole::HrManager])
            ->orderBy('name')
            ->get();

        return UserResource::collection($interviewers);
    }
}
