<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class LogoStorage
{
    public function disk(): Filesystem
    {
        return Storage::disk(config('logo.disk'));
    }

    private function usesRemoteBlobStore(): bool
    {
        return config('filesystems.disks.'.config('logo.disk').'.driver') === 'azure-storage-blob';
    }

    /**
     * Direct-upload target for an org logo — a SAS PUT URL on Azure, a signed local
     * route in dev. Same client contract as the CV flow: PUT to `url`, keep `key`.
     *
     * @return array{key: string, url: string, method: string, headers: array<string, string>}
     */
    public function issueUploadTarget(string $filename, string $contentType): array
    {
        $key = $this->generateKey($filename);
        $expiresAt = now()->addMinutes((int) config('logo.url_ttl_minutes'));
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
            'url' => URL::temporarySignedRoute('public.uploads.logo.put', $expiresAt, ['key' => $key]),
            'method' => 'PUT',
            'headers' => ['Content-Type' => $contentType],
        ];
    }

    /** The permanent, public URL for a stored logo (careers header reads it unauthenticated). */
    public function publicUrl(string $key): string
    {
        return $this->disk()->url($key);
    }

    public function exists(string $key): bool
    {
        return $this->disk()->exists($key);
    }

    public function verify(string $key): LogoVerification
    {
        $disk = $this->disk();

        if (! $disk->exists($key)) {
            return LogoVerification::missing();
        }

        if ($disk->size($key) > (int) config('logo.max_bytes')) {
            return LogoVerification::rejected('The logo is too large.');
        }

        $mime = $disk->mimeType($key) ?: 'application/octet-stream';
        if (! in_array($mime, config('logo.mime_types'), true)) {
            return LogoVerification::rejected('The logo must be a PNG, JPEG, SVG, or WebP image.');
        }

        return LogoVerification::valid();
    }

    private function generateKey(string $filename): string
    {
        $extension = Str::lower(pathinfo($filename, PATHINFO_EXTENSION));
        $name = Str::uuid()->toString();

        // Blobs sit at the root of the dedicated `logos` container, so the public URL is
        // simply <container-url>/<key> with no doubled path segment.
        return in_array($extension, config('logo.extensions'), true)
            ? "logo-{$name}.{$extension}"
            : "logo-{$name}";
    }
}
