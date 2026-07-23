<?php

namespace App\Models\Scopes;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class BelongsToOrganization implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = Auth::user();

        if ($user?->role === UserRole::SuperAdmin) {
            return;
        }

        $builder->where(
            $model->qualifyColumn('organization_id'),
            $user?->organization_id
        );
    }
}
