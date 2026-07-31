<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class CvStorage
{
    public function disk(): Filesystem
    {
        return Storage::disk(config('cv.disk'));
    }

    private function usesRemoteBlobStore(): bool
    {
        return config('filesystems.disks.'.config('cv.disk').'.driver') === 'azure-storage-blob';
    }

    /**
     * Issue a direct-upload target for a CV. On Azure this is a SAS PUT URL; in
     * local dev it's a signed route the browser PUTs to. The client contract is
     * identical either way: PUT the bytes to `url` with `headers`, keep `key`.
     *
     * @return array{key: string, url: string, method: string, headers: array<string, string>}
     */
    public function issueUploadTarget(string $filename, string $contentType): array
    {
        $key = $this->generateKey($filename);
        $expiresAt = now()->addMinutes((int) config('cv.url_ttl_minutes'));
        $disk = $this->disk();

        if ($this->usesRemoteBlobStore() && $disk instanceof FilesystemAdapter) {
            $target = $disk->temporaryUploadUrl($key, $expiresAt, ['content-type' => $contentType]);

            return [
                'key' => $key,
                'url' => $target['url'],
                'method' => 'PUT',
                'headers' => $target['headers'],
            ];
        }

        return [
            'key' => $key,
            'url' => URL::temporarySignedRoute(
                'public.uploads.cv.put',
                $expiresAt,
                ['key' => $key],
            ),
            'method' => 'PUT',
            'headers' => ['Content-Type' => $contentType],
        ];
    }

    /**
     * A short-lived download URL for a stored CV. On Azure this is a SAS GET URL;
     * in local dev it's a signed route that streams the file.
     */
    public function downloadUrl(string $key): string
    {
        $expiresAt = now()->addMinutes((int) config('cv.url_ttl_minutes'));
        $disk = $this->disk();

        if ($this->usesRemoteBlobStore() && $disk instanceof FilesystemAdapter) {
            return $disk->temporaryUrl($key, $expiresAt);
        }

        return URL::temporarySignedRoute('applications.cv.download', $expiresAt, ['key' => $key]);
    }

    public function exists(string $key): bool
    {
        return $this->disk()->exists($key);
    }

    public function verify(string $key): CvVerification
    {
        $disk = $this->disk();

        if (! $disk->exists($key)) {
            return CvVerification::missing();
        }

        $size = $disk->size($key);
        if ($size > (int) config('cv.max_bytes')) {
            return CvVerification::rejected('The uploaded file is too large.');
        }

        $mime = $disk->mimeType($key) ?: 'application/octet-stream';
        if (! in_array($mime, config('cv.mime_types'), true)) {
            return CvVerification::rejected('The uploaded file is not an accepted document type.');
        }

        return CvVerification::valid($mime, $size);
    }

    private function generateKey(string $filename): string
    {
        $extension = Str::lower(pathinfo($filename, PATHINFO_EXTENSION));
        $name = Str::uuid()->toString();

        return in_array($extension, config('cv.extensions'), true)
            ? "cv/{$name}.{$extension}"
            : "cv/{$name}";
    }
}
