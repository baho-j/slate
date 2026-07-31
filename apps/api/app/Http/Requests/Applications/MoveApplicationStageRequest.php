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

        $pipelineIds = Pipeline::query()
            ->where('organization_id', $application->organization_id)
            ->pluck('id');

        return [
            'stage_id' => [
                'required',
                Rule::exists('pipeline_stages', 'id')->whereIn('pipeline_id', $pipelineIds),
            ],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
