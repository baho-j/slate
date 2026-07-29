<?php

namespace App\Http\Requests\Jobs;

use App\Enums\EmploymentType;
use App\Models\Job;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoreJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Job::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'department' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'employment_type' => ['required', Rule::enum(EmploymentType::class)],
            'salary_min' => ['nullable', 'integer', 'min:0'],
            'salary_max' => ['nullable', 'integer', 'min:0', 'gte:salary_min'],
            'currency' => ['nullable', 'required_with:salary_min,salary_max', 'string', 'size:3'],
            'closing_date' => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }

    protected function passedValidation(): void
    {
        $unknown = array_diff(array_keys($this->all()), array_keys($this->rules()));

        if ($unknown !== []) {
            throw ValidationException::withMessages(
                array_fill_keys($unknown, 'This field is not allowed.')
            );
        }
    }
}
