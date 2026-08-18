<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['user_id', 'full_name', 'email', 'phone'])]
class Candidate extends Model
{
    use HasFactory, HasUuids;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /**
     * The current org's pool entry for this candidate, if any (org-scoped by
     * TalentPoolEntry's global scope).
     *
     * @return HasOne<TalentPoolEntry, $this>
     */
    public function talentPoolEntry(): HasOne
    {
        return $this->hasOne(TalentPoolEntry::class);
    }
}
