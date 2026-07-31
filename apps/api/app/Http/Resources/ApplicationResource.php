<?php

namespace App\Http\Resources;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Application
 */
class ApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'eligibility' => $this->eligibility,
            'match_score' => $this->match_score,
            'candidate' => [
                'full_name' => $this->candidate->full_name,
                'email' => $this->candidate->email,
            ],
            'current_stage' => $this->whenLoaded('currentStage', fn () => $this->currentStage ? [
                'id' => $this->currentStage->id,
                'name' => $this->currentStage->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
