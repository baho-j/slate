<?php

namespace App\Http\Requests\Applications;

use App\Models\Application;
use App\Models\Pipeline;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveApplicationStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Application $application */
        $application = $this->route('application');

        $pipelineId = Pipeline::query()
            ->where('job_id', $application->job_id)
            ->value('id');

        return [
            'stage_id' => [
                'required',
                Rule::exists('pipeline_stages', 'id')->where('pipeline_id', $pipelineId),
            ],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
