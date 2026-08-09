<?php

namespace App\Services\Criteria;

use App\Enums\CriterionOperator;
use App\Enums\Eligibility;

class CriteriaEvaluator
{
    /**
     * @param  array<int, Rule|array<string, mixed>>  $rules
     * @param  array<string, mixed>  $answers
     */
    public function evaluate(array $rules, array $answers): Evaluation
    {
        $results = [];

        foreach ($rules as $rule) {
            $rule = $rule instanceof Rule ? $rule : Rule::fromArray($rule);
            $results[] = $this->evaluateRule($rule, $answers);
        }

        return new Evaluation(
            $this->eligibility($results),
            $this->matchScore($results),
            $results,
        );
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    private function evaluateRule(Rule $rule, array $answers): RuleResult
    {
        $hasAnswer = array_key_exists($rule->fieldKey, $answers);
        $answer = $hasAnswer ? $answers[$rule->fieldKey] : null;

        if ($rule->operator === CriterionOperator::Exists) {
            return RuleResult::decided($rule->fieldKey, $rule->mode, $this->isPresent($answer), $rule->weight);
        }

        if (! $hasAnswer || ! $this->isPresent($answer)) {
            return RuleResult::undecidable($rule->fieldKey, $rule->mode, $rule->weight);
        }

        $passed = $this->applyOperator($rule->operator, $answer, $rule->value);

        return $passed === null
            ? RuleResult::undecidable($rule->fieldKey, $rule->mode, $rule->weight)
            : RuleResult::decided($rule->fieldKey, $rule->mode, $passed, $rule->weight);
    }

    private function applyOperator(CriterionOperator $operator, mixed $answer, mixed $expected): ?bool
    {
        return match ($operator) {
            CriterionOperator::Eq => $this->looseEquals($answer, $expected),
            CriterionOperator::Neq => $this->negate($this->looseEquals($answer, $expected)),
            CriterionOperator::Gt => $this->compare($answer, $expected, fn (int $order) => $order > 0),
            CriterionOperator::Gte => $this->compare($answer, $expected, fn (int $order) => $order >= 0),
            CriterionOperator::Lt => $this->compare($answer, $expected, fn (int $order) => $order < 0),
            CriterionOperator::Lte => $this->compare($answer, $expected, fn (int $order) => $order <= 0),
            CriterionOperator::In => $this->membership($answer, $expected),
            CriterionOperator::NotIn => $this->negate($this->membership($answer, $expected)),
            CriterionOperator::IncludesAny => $this->includes($answer, $expected, any: true),
            CriterionOperator::IncludesAll => $this->includes($answer, $expected, any: false),
            CriterionOperator::Exists => $this->isPresent($answer),
        };
    }

    private function isPresent(mixed $answer): bool
    {
        if ($answer === null) {
            return false;
        }

        if (is_string($answer)) {
            return trim($answer) !== '';
        }

        if (is_array($answer)) {
            return $answer !== [];
        }

        return true;
    }

    private function negate(?bool $passed): ?bool
    {
        return $passed === null ? null : ! $passed;
    }

    private function looseEquals(mixed $answer, mixed $expected): ?bool
    {
        if (is_array($answer) || is_array($expected)) {
            return null;
        }

        if (is_bool($answer) || is_bool($expected)) {
            $left = $this->toBool($answer);
            $right = $this->toBool($expected);

            return $left === null || $right === null ? null : $left === $right;
        }

        if ($this->isNumeric($answer) && $this->isNumeric($expected)) {
            return (float) $answer === (float) $expected;
        }

        if (is_scalar($answer) && is_scalar($expected)) {
            return (string) $answer === (string) $expected;
        }

        return null;
    }

    /**
     * @param  callable(int): bool  $satisfied
     */
    private function compare(mixed $answer, mixed $expected, callable $satisfied): ?bool
    {
        if ($this->isNumeric($answer) && $this->isNumeric($expected)) {
            return $satisfied((float) $answer <=> (float) $expected);
        }

        $left = $this->toTimestamp($answer);
        $right = $this->toTimestamp($expected);

        if ($left === null || $right === null) {
            return null;
        }

        return $satisfied($left <=> $right);
    }

    private function membership(mixed $answer, mixed $expected): ?bool
    {
        if (! is_array($expected)) {
            return null;
        }

        foreach ($expected as $candidate) {
            if ($this->looseEquals($answer, $candidate) === true) {
                return true;
            }
        }

        return false;
    }

    private function includes(mixed $answer, mixed $expected, bool $any): ?bool
    {
        if (! is_array($answer) || ! is_array($expected)) {
            return null;
        }

        if ($expected === []) {
            return ! $any;
        }

        foreach ($expected as $candidate) {
            $found = false;

            foreach ($answer as $held) {
                if ($this->looseEquals($held, $candidate) === true) {
                    $found = true;
                    break;
                }
            }

            if ($any && $found) {
                return true;
            }

            if (! $any && ! $found) {
                return false;
            }
        }

        return ! $any;
    }

    private function isNumeric(mixed $value): bool
    {
        return (is_int($value) || is_float($value) || is_string($value)) && is_numeric($value);
    }

    private function toBool(mixed $value): ?bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return match (is_string($value) ? strtolower(trim($value)) : $value) {
            1, '1', 'true', 'yes' => true,
            0, '0', 'false', 'no' => false,
            default => null,
        };
    }

    private function toTimestamp(mixed $value): ?int
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $timestamp = strtotime($value);

        return $timestamp === false ? null : $timestamp;
    }

    /**
     * @param  array<int, RuleResult>  $results
     */
    private function eligibility(array $results): Eligibility
    {
        foreach ($results as $result) {
            if ($result->mode->isKnockout() && $result->passed === false) {
                return Eligibility::Ineligible;
            }
        }

        foreach ($results as $result) {
            if ($result->isUndecidable()) {
                return Eligibility::Manual;
            }
        }

        return Eligibility::Eligible;
    }

    /**
     * @param  array<int, RuleResult>  $results
     */
    private function matchScore(array $results): ?int
    {
        $total = 0;
        $earned = 0;

        foreach ($results as $result) {
            if (! $result->mode->isScored()) {
                continue;
            }

            $total += $result->weight ?? 0;

            if ($result->passed === true) {
                $earned += $result->weight ?? 0;
            }
        }

        if ($total === 0) {
            return null;
        }

        return (int) round(100 * $earned / $total);
    }
}
