<?php

namespace App\Http\Resources;

use App\Models\ScreeningCriterion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ScreeningCriterion
 */
class ScreeningCriterionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'field_key' => $this->field_key,
            'operator' => $this->operator->value,
            'value' => $this->value,
            'mode' => $this->mode->value,
            'weight' => $this->weight,
        ];
    }
}
