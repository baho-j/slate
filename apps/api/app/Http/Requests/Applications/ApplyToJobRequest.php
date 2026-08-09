<?php

namespace App\Http\Requests\Applications;

use App\Models\ApplicationField;
use App\Validation\AnswerRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Collection;

class ApplyToJobRequest extends FormRequest
{
    /** @var Collection<int, ApplicationField>|null */
    private ?Collection $jobFields = null;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'cover_note' => ['nullable', 'string', 'max:5000'],
            'cv_key' => ['required', 'string', 'starts_with:cv/', 'max:255'],
            'cv_original_name' => ['required', 'string', 'max:255'],
            ...AnswerRules::for($this->fields()),
        ];
    }

    public function withValidator(mixed $validator): void
    {
        $validator->after(function ($validator) {
            $known = $this->fields()->pluck('key')->all();

            foreach (array_keys($this->input('answers', [])) as $key) {
                if (! in_array($key, $known, true)) {
                    $validator->errors()->add("answers.{$key}", "The {$key} field does not exist on this job.");
                }
            }
        });
    }

    /**
     * @return Collection<int, ApplicationField>
     */
    private function fields(): Collection
    {
        return $this->jobFields ??= ApplicationField::query()
            ->where('job_id', $this->route('job'))
            ->orderBy('order')
            ->get();
    }
}
