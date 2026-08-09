<?php

use App\Enums\CriterionMode;
use App\Services\Criteria\CriteriaEvaluator;

function evaluateOperator(string $operator, mixed $value, mixed $answer): ?bool
{
    $rules = [[
        'field_key' => 'f',
        'operator' => $operator,
        'value' => $value,
        'mode' => CriterionMode::Knockout->value,
    ]];

    $answers = $answer === '__absent__' ? [] : ['f' => $answer];

    return (new CriteriaEvaluator)->evaluate($rules, $answers)->results[0]->passed;
}

dataset('operators', [
    'eq number passes' => ['eq', 3, 3, true],
    'eq number fails' => ['eq', 3, 4, false],
    'eq coerces string answer to number' => ['eq', 3, '3', true],
    'eq coerces string value to number' => ['eq', '3', 3, true],
    'eq boolean true passes' => ['eq', true, true, true],
    'eq boolean mismatch fails' => ['eq', true, false, false],
    'eq coerces string true to boolean' => ['eq', true, 'true', true],
    'eq string passes' => ['eq', 'bsc', 'bsc', true],
    'eq string is case sensitive' => ['eq', 'bsc', 'BSc', false],
    'eq array answer is undecidable' => ['eq', 'php', ['php'], null],
    'eq treats zero as boolean false' => ['eq', false, 0, true],
    'eq rejects an unrecognised boolean word' => ['eq', true, 'maybe', null],
    'gt across mismatched types is undecidable' => ['gt', '2020-01-01', 5, null],

    'neq passes on difference' => ['neq', 3, 4, true],
    'neq fails on equality' => ['neq', 3, 3, false],
    'neq string difference passes' => ['neq', 'bsc', 'msc', true],

    'gt passes above' => ['gt', 3, 5, true],
    'gt fails at boundary' => ['gt', 3, 3, false],
    'gt fails below' => ['gt', 3, 2, false],
    'gt coerces numeric strings' => ['gt', '3', '5', true],
    'gt on non numeric is undecidable' => ['gt', 3, 'many', null],

    'gte passes at boundary' => ['gte', 3, 3, true],
    'gte passes above' => ['gte', 3, 4, true],
    'gte fails below' => ['gte', 3, 2, false],
    'gte compares dates' => ['gte', '2020-01-01', '2024-06-01', true],
    'gte compares dates failing' => ['gte', '2024-06-01', '2020-01-01', false],

    'lt passes below' => ['lt', 3, 2, true],
    'lt fails at boundary' => ['lt', 3, 3, false],
    'lte passes at boundary' => ['lte', 3, 3, true],
    'lte fails above' => ['lte', 3, 4, false],
    'lte handles float precision' => ['lte', 3.5, 3.5, true],

    'in passes when present' => ['in', ['bsc', 'msc'], 'msc', true],
    'in fails when absent' => ['in', ['bsc', 'msc'], 'phd', false],
    'in coerces numeric members' => ['in', [1, 2, 3], '2', true],
    'in on empty set fails' => ['in', [], 'bsc', false],
    'in with scalar value is undecidable' => ['in', 'bsc', 'bsc', null],

    'not_in passes when absent' => ['not_in', ['bsc'], 'phd', true],
    'not_in fails when present' => ['not_in', ['bsc'], 'bsc', false],

    'includes_any passes on one overlap' => ['includes_any', ['php', 'go'], ['php', 'react'], true],
    'includes_any fails on no overlap' => ['includes_any', ['go', 'rust'], ['php', 'react'], false],
    'includes_any with empty expected fails' => ['includes_any', [], ['php'], false],
    'includes_any on scalar answer is undecidable' => ['includes_any', ['php'], 'php', null],

    'includes_all passes when superset' => ['includes_all', ['php', 'react'], ['php', 'react', 'go'], true],
    'includes_all fails when partial' => ['includes_all', ['php', 'react'], ['php'], false],
    'includes_all with empty expected passes' => ['includes_all', [], ['php'], true],
    'includes_all coerces numeric members' => ['includes_all', [1, 2], ['1', '2'], true],
    'includes_all on an unanswered multiselect is undecidable' => ['includes_all', ['php'], [], null],

    'exists passes when answered' => ['exists', null, 'anything', true],
    'exists passes on false boolean' => ['exists', null, false, true],
    'exists passes on zero' => ['exists', null, 0, true],
    'exists fails when absent' => ['exists', null, '__absent__', false],
    'exists fails on null' => ['exists', null, null, false],
    'exists fails on empty string' => ['exists', null, '   ', false],
    'exists fails on empty array' => ['exists', null, [], false],
]);

test('operator evaluates to the expected outcome', function (string $operator, mixed $value, mixed $answer, ?bool $expected) {
    expect(evaluateOperator($operator, $value, $answer))->toBe($expected);
})->with('operators');

dataset('missing answers', [
    ['eq', 3],
    ['neq', 3],
    ['gt', 3],
    ['gte', 3],
    ['lt', 3],
    ['lte', 3],
    ['in', ['a']],
    ['not_in', ['a']],
    ['includes_any', ['a']],
    ['includes_all', ['a']],
]);

test('a missing answer is undecidable for every operator but exists', function (string $operator, mixed $value) {
    expect(evaluateOperator($operator, $value, '__absent__'))->toBeNull()
        ->and(evaluateOperator($operator, $value, null))->toBeNull()
        ->and(evaluateOperator($operator, $value, ''))->toBeNull();
})->with('missing answers');
