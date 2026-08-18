<?php

namespace App\Http\Requests\Uploads;

use App\Models\Organization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LogoUploadRequest extends FormRequest
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
            'filename' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', Rule::in(config('logo.mime_types'))],
            'size' => ['required', 'integer', 'min:1', 'max:'.config('logo.max_bytes')],
        ];
    }
}
