<?php

namespace App\Http\Requests\Pipelines;

use App\Models\Job;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReplacePipelineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('configurePipeline', $this->route('job'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'stages' => ['present', 'array', 'min:1'],
            'stages.*.id' => [
                'nullable',
                'integer',
                Rule::exists('pipeline_stages', 'id')->where('pipeline_id', $this->pipelineId()),
            ],
            'stages.*.name' => ['required', 'string', 'max:255', 'distinct'],
            'stages.*.is_terminal' => ['required', 'boolean'],
        ];
    }

    public function withValidator(mixed $validator): void
    {
        $validator->after(function ($validator) {
            $terminal = array_filter(
                $this->input('stages', []),
                fn (array $stage) => filter_var($stage['is_terminal'] ?? false, FILTER_VALIDATE_BOOLEAN),
            );

            if (count($terminal) === count($this->input('stages', []))) {
                $validator->errors()->add('stages', 'A pipeline needs at least one stage that is not an end state.');
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'stages.min' => 'A pipeline needs at least one stage.',
            'stages.*.name.distinct' => 'Stage names must be unique within a pipeline.',
            'stages.*.id.exists' => 'That stage does not belong to this job.',
        ];
    }

    private function pipelineId(): ?int
    {
        /** @var Job $job */
        $job = $this->route('job');

        return $job->pipeline()->value('id');
    }
}
