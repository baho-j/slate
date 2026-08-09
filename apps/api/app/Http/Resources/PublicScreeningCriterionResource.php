<?php

namespace App\Http\Resources;

use App\Models\ScreeningCriterion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ScreeningCriterion
 */
class PublicScreeningCriterionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'field_key' => $this->field_key,
            'operator' => $this->operator->value,
            'value' => $this->value,
            'mode' => $this->mode->value,
        ];
    }
}
