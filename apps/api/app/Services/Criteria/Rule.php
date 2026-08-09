<?php

namespace App\Services\Criteria;

use App\Enums\CriterionMode;
use App\Enums\CriterionOperator;

class Rule
{
    public function __construct(
        public readonly string $fieldKey,
        public readonly CriterionOperator $operator,
        public readonly mixed $value,
        public readonly CriterionMode $mode,
        public readonly ?int $weight = null,
    ) {}

    /**
     * @param  array<string, mixed>  $rule
     */
    public static function fromArray(array $rule): self
    {
        $operator = $rule['operator'];
        $mode = $rule['mode'];

        return new self(
            $rule['field_key'],
            $operator instanceof CriterionOperator ? $operator : CriterionOperator::from($operator),
            $rule['value'] ?? null,
            $mode instanceof CriterionMode ? $mode : CriterionMode::from($mode),
            isset($rule['weight']) ? (int) $rule['weight'] : null,
        );
    }

    public function isScored(): bool
    {
        return $this->mode === CriterionMode::Scored;
    }

    public function scoreWeight(): int
    {
        return $this->weight ?? 0;
    }
}
