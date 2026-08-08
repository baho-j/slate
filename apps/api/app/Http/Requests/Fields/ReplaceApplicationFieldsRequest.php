<?php

namespace App\Http\Requests\Fields;

use App\Enums\FieldType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReplaceApplicationFieldsRequest extends FormRequest
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
            'fields' => ['present', 'array'],
            'fields.*.label' => ['required', 'string', 'max:255'],
            'fields.*.key' => ['required', 'string', 'regex:/^[a-z][a-z0-9_]*$/', 'distinct', 'max:255'],
            'fields.*.type' => ['required', Rule::enum(FieldType::class)],
            'fields.*.required' => ['required', 'boolean'],
            'fields.*.order' => ['required', 'integer', 'min:0'],
            'fields.*.options' => ['array'],
            'fields.*.options.*' => ['string', 'max:255'],
        ];
    }

    public function withValidator(mixed $validator): void
    {
        $optionTypes = [FieldType::Select->value, FieldType::Multiselect->value];

        $validator->after(function ($validator) use ($optionTypes) {
            foreach ($this->input('fields', []) as $index => $field) {
                $type = $field['type'] ?? null;
                $hasOptions = ! empty($field['options']);

                if (in_array($type, $optionTypes, true) && ! $hasOptions) {
                    $validator->errors()->add("fields.{$index}.options", 'Options are required for select fields.');
                }

                if (! in_array($type, $optionTypes, true) && $hasOptions) {
                    $validator->errors()->add("fields.{$index}.options", 'Options are only allowed on select fields.');
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'fields.*.key.regex' => 'The key must be snake_case (lowercase letters, numbers, and underscores).',
        ];
    }
}
