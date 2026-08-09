<?php

use App\Enums\Eligibility;
use App\Services\Criteria\CriteriaEvaluator;

function knockout(string $key, string $operator, mixed $value): array
{
    return ['field_key' => $key, 'operator' => $operator, 'value' => $value, 'mode' => 'knockout'];
}

function scored(string $key, string $operator, mixed $value, int $weight): array
{
    return ['field_key' => $key, 'operator' => $operator, 'value' => $value, 'mode' => 'scored', 'weight' => $weight];
}

function evaluate(array $rules, array $answers): array
{
    return (new CriteriaEvaluator)->evaluate($rules, $answers)->toArray();
}

test('an empty rule set is eligible with no score', function () {
    expect(evaluate([], []))->toMatchArray([
        'eligibility' => 'eligible',
        'match_score' => null,
        'results' => [],
    ]);
});

test('all knockouts passing is eligible', function () {
    $result = evaluate(
        [knockout('years', 'gte', 3), knockout('permit', 'eq', true)],
        ['years' => 5, 'permit' => true],
    );

    expect($result['eligibility'])->toBe('eligible')
        ->and($result['match_score'])->toBeNull();
});

test('a single failed knockout makes the application ineligible', function () {
    $result = evaluate(
        [knockout('years', 'gte', 3), knockout('permit', 'eq', true)],
        ['years' => 1, 'permit' => true],
    );

    expect($result['eligibility'])->toBe('ineligible');
});

test('a failed knockout overrides an otherwise perfect score', function () {
    $result = evaluate(
        [
            knockout('permit', 'eq', true),
            scored('skills', 'includes_all', ['php', 'react'], 30),
            scored('degree', 'in', ['bsc', 'msc'], 20),
        ],
        ['permit' => false, 'skills' => ['php', 'react'], 'degree' => 'msc'],
    );

    expect($result['eligibility'])->toBe('ineligible')
        ->and($result['match_score'])->toBe(100);
});

test('a failed knockout takes precedence over an undecidable rule', function () {
    $result = evaluate(
        [knockout('permit', 'eq', true), knockout('years', 'gte', 3)],
        ['permit' => false],
    );

    expect($result['eligibility'])->toBe('ineligible');
});

test('a missing answer flags the application for manual review', function () {
    $result = evaluate([knockout('years', 'gte', 3)], []);

    expect($result['eligibility'])->toBe('manual')
        ->and($result['results'][0]['passed'])->toBeNull();
});

test('a missing answer on a scored rule flags manual and does not earn its weight', function () {
    $result = evaluate(
        [scored('skills', 'includes_all', ['php'], 40), scored('degree', 'in', ['bsc'], 60)],
        ['degree' => 'bsc'],
    );

    expect($result['eligibility'])->toBe('manual')
        ->and($result['match_score'])->toBe(60);
});

test('a failed scored rule alone stays eligible', function () {
    $result = evaluate([scored('degree', 'in', ['msc'], 50)], ['degree' => 'bsc']);

    expect($result['eligibility'])->toBe('eligible')
        ->and($result['match_score'])->toBe(0);
});

test('match score is null when no scored rules exist', function () {
    $result = evaluate([knockout('permit', 'eq', true)], ['permit' => true]);

    expect($result['match_score'])->toBeNull();
});

test('match score is null when every scored rule carries zero weight', function () {
    $result = evaluate([scored('degree', 'in', ['bsc'], 0)], ['degree' => 'bsc']);

    expect($result['match_score'])->toBeNull();
});

dataset('score sets', [
    'all passing is 100' => [[['a', true, 30], ['b', true, 70]], 100],
    'none passing is 0' => [[['a', false, 30], ['b', false, 70]], 0],
    'equal weights halve' => [[['a', true, 50], ['b', false, 50]], 50],
    'unequal weights favour the heavier rule' => [[['a', true, 70], ['b', false, 30]], 70],
    'rounds a third down' => [[['a', true, 1], ['b', false, 1], ['c', false, 1]], 33],
    'rounds two thirds up' => [[['a', true, 1], ['b', true, 1], ['c', false, 1]], 67],
    'splits equally on two rules' => [[['a', true, 1], ['b', false, 1]], 50],
    'rounds an exact half up' => [[['a', true, 1], ['b', false, 7]], 13],
    'rounds three eighths up' => [[['a', true, 3], ['b', false, 5]], 38],
    'rounds one sixth up' => [[['a', true, 1], ['b', false, 5]], 17],
    'a zero weight rule cannot earn score' => [[['a', true, 0], ['b', false, 10]], 0],
    'a zero weight rule does not dilute score' => [[['a', false, 0], ['b', true, 10]], 100],
]);

test('match score is the weighted percentage of passing scored rules', function (array $spec, int $expected) {
    $rules = [];
    $answers = [];

    foreach ($spec as [$key, $shouldPass, $weight]) {
        $rules[] = scored($key, 'eq', 'wanted', $weight);
        $answers[$key] = $shouldPass ? 'wanted' : 'other';
    }

    expect(evaluate($rules, $answers)['match_score'])->toBe($expected);
})->with('score sets');

test('results report each rule with its mode and weight', function () {
    $result = evaluate(
        [knockout('permit', 'eq', true), scored('degree', 'in', ['bsc'], 25)],
        ['permit' => true, 'degree' => 'bsc'],
    );

    expect($result['results'])->toBe([
        ['field_key' => 'permit', 'mode' => 'knockout', 'passed' => true],
        ['field_key' => 'degree', 'mode' => 'scored', 'passed' => true, 'weight' => 25],
    ]);
});

test('results preserve rule order including repeated fields', function () {
    $result = evaluate(
        [knockout('years', 'gte', 3), knockout('years', 'lte', 10)],
        ['years' => 5],
    );

    expect($result['results'])->toHaveCount(2)
        ->and(array_column($result['results'], 'passed'))->toBe([true, true]);
});

test('the evaluation exposes a typed eligibility', function () {
    $evaluation = (new CriteriaEvaluator)->evaluate([knockout('permit', 'eq', true)], ['permit' => false]);

    expect($evaluation->eligibility)->toBe(Eligibility::Ineligible);
});

test('a realistic mixed rule set scores and stays eligible', function () {
    $result = evaluate(
        [
            knockout('years_experience', 'gte', 3),
            knockout('has_work_permit', 'eq', true),
            scored('skills', 'includes_all', ['php', 'react'], 30),
            scored('degree', 'in', ['bsc', 'msc'], 20),
            scored('portfolio', 'exists', null, 10),
        ],
        [
            'years_experience' => 6,
            'has_work_permit' => true,
            'skills' => ['php', 'react', 'sql'],
            'degree' => 'phd',
            'portfolio' => 'https://example.test',
        ],
    );

    expect($result['eligibility'])->toBe('eligible')
        ->and($result['match_score'])->toBe(67);
});
