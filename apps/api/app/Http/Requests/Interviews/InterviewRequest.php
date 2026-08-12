<?php

namespace App\Http\Requests\Interviews;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

abstract class InterviewRequest extends FormRequest
{
    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'interviewer_id.exists' => 'That person cannot be assigned as an interviewer.',
            'scheduled_at.after' => 'An interview must be scheduled in the future.',
        ];
    }

    protected function interviewerRule(): Exists
    {
        return Rule::exists('users', 'id')
            ->where('organization_id', $this->organizationId())
            ->whereIn('role', [
                UserRole::Interviewer->value,
                UserRole::Recruiter->value,
                UserRole::HrManager->value,
            ]);
    }

    abstract protected function organizationId(): ?int;
}
