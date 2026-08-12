<?php

namespace App\Http\Resources;

use App\Models\Application;
use App\Models\Pipeline;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Application
 */
class ApplicationDetailResource extends JsonResource
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
            'cover_note' => $this->cover_note,
            'created_at' => $this->created_at?->toIso8601String(),
            'candidate' => [
                'full_name' => $this->candidate->full_name,
                'email' => $this->candidate->email,
                'phone' => $this->candidate->phone,
            ],
            'current_stage' => $this->currentStage ? [
                'id' => $this->currentStage->id,
                'name' => $this->currentStage->name,
            ] : null,
            'available_stages' => $this->availableStages(),
            'documents' => $this->documents->map(fn ($document) => [
                'id' => $document->id,
                'kind' => $document->kind,
                'original_name' => $document->original_name,
                'mime' => $document->mime,
                'size_bytes' => $document->size_bytes,
            ])->all(),
            'interviews' => InterviewResource::collection(
                $this->whenLoaded('interviews', fn () => $this->interviews->sortBy('scheduled_at')->values())
            ),
            'status_history' => $this->statusHistory
                ->sortByDesc('created_at')
                ->values()
                ->map(fn ($entry) => [
                    'id' => $entry->id,
                    'from_status' => $entry->from_status,
                    'to_status' => $entry->to_status,
                    'to_stage' => $entry->toStage?->name,
                    'note' => $entry->note,
                    'created_at' => $entry->created_at?->toIso8601String(),
                ])->all(),
        ];
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    private function availableStages(): array
    {
        return Pipeline::query()
            ->where('job_id', $this->job_id)
            ->with('stages')
            ->first()
            ?->stages
            ->map(fn ($stage) => ['id' => $stage->id, 'name' => $stage->name])
            ->all() ?? [];
    }
}
