<?php

namespace App\Http\Resources;

use App\Models\Interview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Interview
 */
class InterviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'location' => $this->location,
            'status' => $this->status->value,
            'notes' => $this->notes,
            'interviewer' => $this->whenLoaded('interviewer', fn () => [
                'id' => $this->interviewer->id,
                'name' => $this->interviewer->name,
                'email' => $this->interviewer->email,
            ]),
            'evaluation' => $this->whenLoaded(
                'evaluation',
                fn () => $this->evaluation ? InterviewEvaluationResource::make($this->evaluation) : null
            ),
            'application' => $this->whenLoaded('application', fn () => [
                'id' => $this->application->id,
                'candidate' => [
                    'full_name' => $this->application->candidate->full_name,
                ],
                'job' => [
                    'id' => $this->application->job->id,
                    'title' => $this->application->job->title,
                ],
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
