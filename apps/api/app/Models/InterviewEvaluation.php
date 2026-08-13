<?php

namespace App\Models;

use App\Enums\Recommendation;
use App\Models\Concerns\HasOrganization;
use Database\Factories\InterviewEvaluationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'interview_id', 'rating', 'recommendation', 'comments', 'created_by',
])]
class InterviewEvaluation extends Model
{
    /** @use HasFactory<InterviewEvaluationFactory> */
    use HasFactory, HasOrganization, HasUuids;

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'recommendation' => Recommendation::class,
        ];
    }

    /** @return BelongsTo<Interview, $this> */
    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
