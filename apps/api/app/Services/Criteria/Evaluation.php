<?php

namespace App\Services\Criteria;

use App\Enums\Eligibility;

class Evaluation
{
    /**
     * @param  array<int, RuleResult>  $results
     */
    public function __construct(
        public readonly Eligibility $eligibility,
        public readonly ?int $matchScore,
        public readonly array $results,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'eligibility' => $this->eligibility->value,
            'match_score' => $this->matchScore,
            'results' => array_map(fn (RuleResult $result) => $result->toArray(), $this->results),
        ];
    }
}
