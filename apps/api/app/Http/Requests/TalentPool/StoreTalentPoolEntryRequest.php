<?php

namespace App\Http\Requests\TalentPool;

use App\Models\TalentPoolEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTalentPoolEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', TalentPoolEntry::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'candidate_id' => [
                'required',
                'uuid',
                // Only a candidate who applied to this org may be pooled by it.
                Rule::exists('applications', 'candidate_id')
                    ->where('organization_id', $this->user()->organization_id),
            ],
            'tags' => ['sometimes', 'array', 'max:20'],
            'tags.*' => ['string', 'max:40'],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'candidate_id.exists' => 'That candidate has not applied to your organisation.',
        ];
    }
}
