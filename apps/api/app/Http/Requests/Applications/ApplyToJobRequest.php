<?php

namespace App\Http\Requests\Applications;

use Illuminate\Foundation\Http\FormRequest;

class ApplyToJobRequest extends FormRequest
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
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'cover_note' => ['nullable', 'string', 'max:5000'],
            'cv_key' => ['required', 'string', 'starts_with:cv/', 'max:255'],
            'cv_original_name' => ['required', 'string', 'max:255'],
        ];
    }
}
