<?php

namespace App\Http\Resources;

use App\Models\Job;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Job
 */
class PublicJobResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'department' => $this->department,
            'location' => $this->location,
            'employment_type' => $this->employment_type->value,
            'salary_min' => $this->salary_min,
            'salary_max' => $this->salary_max,
            'currency' => $this->currency,
            'closing_date' => $this->closing_date?->toDateString(),
            'published_at' => $this->updated_at?->toIso8601String(),
            'fields' => ApplicationFieldResource::collection($this->whenLoaded('applicationFields')),
            'criteria' => PublicScreeningCriterionResource::collection($this->whenLoaded('screeningCriteria')),
        ];
    }
}
