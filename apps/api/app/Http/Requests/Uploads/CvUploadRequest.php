<?php

namespace App\Http\Requests\Uploads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CvUploadRequest extends FormRequest
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
            'filename' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', Rule::in(config('cv.mime_types'))],
            'size' => ['required', 'integer', 'min:1', 'max:'.config('cv.max_bytes')],
        ];
    }
}
