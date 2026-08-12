<?php

namespace App\Http\Requests\Interviews;

use App\Models\Application;
use App\Models\Interview;

class StoreInterviewRequest extends InterviewRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [Interview::class, $this->application()]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'interviewer_id' => ['required', $this->interviewerRule()],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function application(): Application
    {
        /** @var Application $application */
        $application = $this->route('application');

        return $application;
    }

    protected function organizationId(): ?int
    {
        return $this->application()->organization_id;
    }
}
