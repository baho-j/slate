<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use App\Enums\Eligibility;
use App\Models\Concerns\HasOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'job_id', 'candidate_id', 'current_stage_id', 'status',
    'eligibility', 'match_score', 'cover_note',
])]
class Application extends Model
{
    use HasFactory, HasOrganization, HasUuids;

    protected $attributes = [
        'status' => 'applied',
        'eligibility' => 'manual',
    ];

    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'eligibility' => Eligibility::class,
            'match_score' => 'integer',
        ];
    }

    /** @return BelongsTo<Job, $this> */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    /** @return BelongsTo<Candidate, $this> */
    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    /** @return BelongsTo<PipelineStage, $this> */
    public function currentStage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'current_stage_id');
    }

    /** @return HasMany<ApplicationAnswer, $this> */
    public function answers(): HasMany
    {
        return $this->hasMany(ApplicationAnswer::class);
    }

    /** @return HasMany<ApplicationDocument, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(ApplicationDocument::class);
    }

    /** @return HasMany<ApplicationStatusHistory, $this> */
    public function statusHistory(): HasMany
    {
        return $this->hasMany(ApplicationStatusHistory::class);
    }

    /** @return HasMany<Interview, $this> */
    public function interviews(): HasMany
    {
        return $this->hasMany(Interview::class);
    }
}
