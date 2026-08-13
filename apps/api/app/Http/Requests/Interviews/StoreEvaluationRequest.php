<?php

namespace App\Http\Requests\Interviews;

use App\Enums\Recommendation;
use App\Models\Interview;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('submitEvaluation', $this->interview());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'recommendation' => ['required', Rule::enum(Recommendation::class)],
            'comments' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $interview = $this->interview();

            if (! $interview->status->isOpen()) {
                $validator->errors()->add('status', 'This interview can no longer be evaluated.');
            }

            if ($interview->evaluation()->exists()) {
                $validator->errors()->add('rating', 'This interview has already been evaluated.');
            }
        });
    }

    public function interview(): Interview
    {
        /** @var Interview $interview */
        $interview = $this->route('interview');

        return $interview;
    }
}
