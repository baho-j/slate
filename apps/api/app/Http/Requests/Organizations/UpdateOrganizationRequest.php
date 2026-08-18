<?php

namespace App\Http\Requests\Organizations;

use App\Models\Organization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class UpdateOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->user()->organization ?? new Organization);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            // The key returned by the logo upload; resolved to a stored URL in the controller.
            'logo_key' => ['sometimes', 'nullable', 'string', 'starts_with:logos/', 'max:255'],
        ];
    }

    protected function passedValidation(): void
    {
        $allowed = array_keys($this->rules());
        $unknown = array_diff(array_keys($this->all()), $allowed);

        if ($unknown !== []) {
            throw ValidationException::withMessages([
                array_key_first($unknown === [] ? [] : $unknown) => 'Unknown field.',
            ]);
        }
    }
}
