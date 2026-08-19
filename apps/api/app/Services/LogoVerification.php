<?php

namespace App\Services;

class LogoVerification
{
    private function __construct(
        public readonly bool $ok,
        public readonly ?string $error = null,
    ) {}

    public static function valid(): self
    {
        return new self(true);
    }

    public static function rejected(string $error): self
    {
        return new self(false, error: $error);
    }

    public static function missing(): self
    {
        return new self(false, error: 'The uploaded logo could not be found.');
    }
}
