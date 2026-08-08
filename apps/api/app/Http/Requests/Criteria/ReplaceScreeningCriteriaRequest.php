<?php

namespace App\Http\Requests\Criteria;

use App\Enums\CriterionMode;
use App\Enums\CriterionOperator;
use App\Models\Job;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReplaceScreeningCriteriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('job'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'criteria' => ['present', 'array'],
            'criteria.*.field_key' => ['required', 'string'],
            'criteria.*.operator' => ['required', Rule::enum(CriterionOperator::class)],
            'criteria.*.value' => ['present'],
            'criteria.*.mode' => ['required', Rule::enum(CriterionMode::class)],
            'criteria.*.weight' => ['integer', 'min:1'],
        ];
    }

    public function withValidator(mixed $validator): void
    {
        $validator->after(function ($validator) {
            /** @var Job $job */
            $job = $this->route('job');
            $fields = $job->applicationFields()->get()->keyBy('key');

            foreach ($this->input('criteria', []) as $index => $rule) {
                $this->validateFieldKey($validator, $index, $rule, $fields);
                $this->validateWeight($validator, $index, $rule);
            }
        });
    }

    private function validateFieldKey($validator, int $index, array $rule, $fields): void
    {
        $key = $rule['field_key'] ?? null;
        $operator = CriterionOperator::tryFrom($rule['operator'] ?? '');

        if ($key === null || ! $fields->has($key)) {
            $validator->errors()->add("criteria.{$index}.field_key", 'The field key must reference a field on this job.');

            return;
        }

        if ($operator !== null && ! $operator->supports($fields->get($key)->type)) {
            $validator->errors()->add(
                "criteria.{$index}.operator",
                "The {$operator->value} operator is not valid for the {$fields->get($key)->type->value} field."
            );
        }
    }

    private function validateWeight($validator, int $index, array $rule): void
    {
        $mode = CriterionMode::tryFrom($rule['mode'] ?? '');
        $hasWeight = array_key_exists('weight', $rule) && $rule['weight'] !== null;

        if ($mode === CriterionMode::Scored && ! $hasWeight) {
            $validator->errors()->add("criteria.{$index}.weight", 'Weight is required for scored rules.');
        }

        if ($mode === CriterionMode::Knockout && $hasWeight) {
            $validator->errors()->add("criteria.{$index}.weight", 'Weight is only allowed on scored rules.');
        }
    }
}
