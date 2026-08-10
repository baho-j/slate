<?php

namespace App\Http\Resources;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Pipeline
 */
class PipelineResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'stages' => $this->stages->map(fn (PipelineStage $stage) => [
                'id' => $stage->id,
                'name' => $stage->name,
                'order' => $stage->order,
                'is_terminal' => $stage->is_terminal,
                'application_count' => $stage->applications_count,
            ])->all(),
        ];
    }
}
