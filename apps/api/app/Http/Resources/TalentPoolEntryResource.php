<?php

namespace App\Http\Resources;

use App\Models\TalentPoolEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TalentPoolEntry
 */
class TalentPoolEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tags' => $this->tags,
            'note' => $this->note,
            'candidate' => [
                'id' => $this->candidate->id,
                'full_name' => $this->candidate->full_name,
                'email' => $this->candidate->email,
            ],
            'added_by' => $this->whenLoaded('addedBy', fn () => $this->addedBy ? [
                'id' => $this->addedBy->id,
                'name' => $this->addedBy->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
