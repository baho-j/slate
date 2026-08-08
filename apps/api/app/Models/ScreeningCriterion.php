<?php

namespace App\Models;

use App\Enums\CriterionMode;
use App\Enums\CriterionOperator;
use Database\Factories\ScreeningCriterionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'job_id', 'field_key', 'operator', 'value', 'mode', 'weight',
])]
class ScreeningCriterion extends Model
{
    /** @use HasFactory<ScreeningCriterionFactory> */
    use HasFactory;

    protected $table = 'screening_criteria';

    protected function casts(): array
    {
        return [
            'operator' => CriterionOperator::class,
            'mode' => CriterionMode::class,
            'value' => 'array',
            'weight' => 'integer',
        ];
    }

    /** @return BelongsTo<Job, $this> */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }
}
