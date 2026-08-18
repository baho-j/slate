<?php

namespace App\Http\Controllers;

use App\Http\Requests\Uploads\LogoUploadRequest;
use App\Services\LogoStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogoUploadController extends Controller
{
    public function __construct(private readonly LogoStorage $logos) {}

    public function store(LogoUploadRequest $request): JsonResponse
    {
        $target = $this->logos->issueUploadTarget(
            $request->string('filename'),
            $request->string('content_type'),
        );

        return response()->json($target, 201);
    }

    public function put(Request $request, string $key): JsonResponse
    {
        abort_unless($request->hasValidSignature(), 403);

        $contents = $request->getContent();
        if ($contents === '' || strlen($contents) > (int) config('logo.max_bytes')) {
            abort(422, 'Invalid upload.');
        }

        $this->logos->disk()->put($key, $contents);

        return response()->json(['key' => $key], 200);
    }
}
