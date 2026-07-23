<?php

namespace App\Models\Concerns;

use App\Models\Organization;
use App\Models\Scopes\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

#[ScopedBy(BelongsToOrganization::class)]
trait HasOrganization
{
    public static function bootHasOrganization(): void
    {
        static::creating(function ($model) {
            $model->organization_id ??= Auth::user()?->organization_id;
        });
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
