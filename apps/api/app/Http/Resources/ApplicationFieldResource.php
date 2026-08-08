<?php

namespace App\Http\Resources;

use App\Models\ApplicationField;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApplicationField
 */
class ApplicationFieldResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'key' => $this->key,
            'type' => $this->type->value,
            'required' => $this->required,
            'options' => $this->options,
            'order' => $this->order,
        ];
    }
}
