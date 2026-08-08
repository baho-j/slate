<?php

namespace App\Models;

use App\Enums\FieldType;
use Database\Factories\ApplicationFieldFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'job_id', 'label', 'key', 'type', 'required', 'options', 'order',
])]
class ApplicationField extends Model
{
    /** @use HasFactory<ApplicationFieldFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => FieldType::class,
            'required' => 'boolean',
            'options' => 'array',
            'order' => 'integer',
        ];
    }

    /** @return BelongsTo<Job, $this> */
    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }
}
