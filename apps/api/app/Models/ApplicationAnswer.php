<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'application_id', 'field_id', 'field_key', 'value',
])]
class ApplicationAnswer extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    /** @return BelongsTo<Application, $this> */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /** @return BelongsTo<ApplicationField, $this> */
    public function field(): BelongsTo
    {
        return $this->belongsTo(ApplicationField::class, 'field_id');
    }
}
