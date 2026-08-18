<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserManagementController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->where('organization_id', $request->user()->organization_id)
            ->orderBy('name')
            ->paginate(50)
            ->withQueryString();

        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create([
            ...$request->validated(),
            // The user is invited and sets their own password out of band; a random one
            // here means the account can't be signed into until that happens.
            'password' => Hash::make(Str::random(40)),
            'organization_id' => $request->user()->organization_id,
        ]);

        return UserResource::make($user)->response()->setStatusCode(201);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $user->update($request->validated());

        return UserResource::make($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        if ($this->isLastHrManager($user)) {
            return response()->json(
                ['message' => 'This is the last HR manager; assign another before removing this one.'],
                422,
            );
        }

        $user->delete();

        return response()->json(status: 204);
    }

    private function isLastHrManager(User $user): bool
    {
        return $user->role === UserRole::HrManager
            && User::query()
                ->where('organization_id', $user->organization_id)
                ->where('role', UserRole::HrManager)
                ->where('id', '!=', $user->id)
                ->doesntExist();
    }
}
