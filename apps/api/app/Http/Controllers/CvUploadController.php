<?php

namespace App\Http\Controllers;

use App\Http\Requests\Uploads\CvUploadRequest;
use App\Services\CvStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CvUploadController extends Controller
{
    public function __construct(private readonly CvStorage $cv) {}

    public function store(CvUploadRequest $request): JsonResponse
    {
        $target = $this->cv->issueUploadTarget(
            $request->string('filename'),
            $request->string('content_type'),
        );

        return response()->json($target, 201);
    }

    public function put(Request $request, string $key): JsonResponse
    {
        abort_unless($request->hasValidSignature(), 403);

        $contents = $request->getContent();
        if ($contents === '' || strlen($contents) > (int) config('cv.max_bytes')) {
            abort(422, 'Invalid upload.');
        }

        $this->cv->disk()->put($key, $contents);

        return response()->json(['key' => $key], 200);
    }

    public function download(Request $request, string $key): StreamedResponse
    {
        abort_unless($request->hasValidSignature(), 403);
        abort_unless($this->cv->exists($key), 404);

        return $this->cv->disk()->download($key);
    }
}
