<?php

namespace App\Validation;

use App\Enums\FieldType;
use App\Models\ApplicationField;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class AnswerRules
{
    /**
     * @param  Collection<int, ApplicationField>  $fields
     * @return array<string, mixed>
     */
    public static function for(Collection $fields): array
    {
        $rules = ['answers' => ['array']];

        foreach ($fields as $field) {
            $key = "answers.{$field->key}";
            $rules[$key] = self::forField($field);

            if ($field->type === FieldType::Multiselect) {
                $rules["{$key}.*"] = ['string', Rule::in($field->options ?? [])];
            }
        }

        return $rules;
    }

    /**
     * @return array<int, mixed>
     */
    private static function forField(ApplicationField $field): array
    {
        $rules = [$field->required ? 'required' : 'nullable'];

        return [...$rules, ...match ($field->type) {
            FieldType::Text, FieldType::File => ['string', 'max:5000'],
            FieldType::Number => ['numeric'],
            FieldType::Boolean => ['boolean'],
            FieldType::Date => ['date'],
            FieldType::Select => ['string', Rule::in($field->options ?? [])],
            FieldType::Multiselect => ['array'],
        }];
    }
}
