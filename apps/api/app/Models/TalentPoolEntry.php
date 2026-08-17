<?php

namespace App\Models;

use App\Models\Concerns\HasOrganization;
use Database\Factories\TalentPoolEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['candidate_id', 'tags', 'note', 'added_by'])]
class TalentPoolEntry extends Model
{
    /** @use HasFactory<TalentPoolEntryFactory> */
    use HasFactory, HasOrganization, HasUuids;

    protected $attributes = [
        'tags' => '[]',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
        ];
    }

    /** @return BelongsTo<Candidate, $this> */
    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    /** @return BelongsTo<User, $this> */
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
