<?php

namespace App\Services;

class CvVerification
{
    private function __construct(
        public readonly bool $ok,
        public readonly ?string $mime = null,
        public readonly ?int $size = null,
        public readonly ?string $error = null,
    ) {}

    public static function valid(string $mime, int $size): self
    {
        return new self(true, $mime, $size);
    }

    public static function rejected(string $error): self
    {
        return new self(false, error: $error);
    }

    public static function missing(): self
    {
        return new self(false, error: 'The uploaded file could not be found.');
    }
}
