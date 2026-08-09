<?php

namespace App\Services\Criteria;

use App\Enums\CriterionMode;

class RuleResult
{
    private function __construct(
        public readonly string $fieldKey,
        public readonly CriterionMode $mode,
        public readonly ?bool $passed,
        public readonly ?int $weight,
    ) {}

    public static function decided(string $fieldKey, CriterionMode $mode, bool $passed, ?int $weight): self
    {
        return new self($fieldKey, $mode, $passed, $weight);
    }

    public static function undecidable(string $fieldKey, CriterionMode $mode, ?int $weight): self
    {
        return new self($fieldKey, $mode, null, $weight);
    }

    public function isUndecidable(): bool
    {
        return $this->passed === null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $result = [
            'field_key' => $this->fieldKey,
            'mode' => $this->mode->value,
            'passed' => $this->passed,
        ];

        if ($this->mode->isScored()) {
            $result['weight'] = $this->weight;
        }

        return $result;
    }
}
