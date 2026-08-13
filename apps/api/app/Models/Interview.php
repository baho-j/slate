<?php

namespace App\Models;

use App\Enums\InterviewStatus;
use App\Models\Concerns\HasOrganization;
use Database\Factories\InterviewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'application_id', 'interviewer_id', 'scheduled_at',
    'location', 'status', 'notes', 'created_by',
])]
class Interview extends Model
{
    /** @use HasFactory<InterviewFactory> */
    use HasFactory, HasOrganization, HasUuids;

    protected $attributes = [
        'status' => 'scheduled',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'status' => InterviewStatus::class,
        ];
    }

    /** @return BelongsTo<Application, $this> */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /** @return BelongsTo<User, $this> */
    public function interviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'interviewer_id');
    }

    /** @return HasOne<InterviewEvaluation, $this> */
    public function evaluation(): HasOne
    {
        return $this->hasOne(InterviewEvaluation::class);
    }

    /**
     * @param  Builder<$this>  $query
     * @return Builder<$this>
     */
    public function scopeAssignedTo(Builder $query, User $user): Builder
    {
        return $query->where('interviewer_id', $user->id);
    }
}
