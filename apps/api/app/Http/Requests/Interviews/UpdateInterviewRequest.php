<?php

namespace App\Http\Requests\Interviews;

use App\Enums\InterviewStatus;
use App\Models\Interview;
use Illuminate\Validation\Rule;

class UpdateInterviewRequest extends InterviewRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->interview());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'interviewer_id' => ['sometimes', $this->interviewerRule()],
            'scheduled_at' => ['sometimes', 'date', 'after:now'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::enum(InterviewStatus::class)],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    public function interview(): Interview
    {
        /** @var Interview $interview */
        $interview = $this->route('interview');

        return $interview;
    }

    protected function organizationId(): ?int
    {
        return $this->interview()->organization_id;
    }
}
