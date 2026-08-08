<?php

use App\Enums\FieldType;
use App\Models\ApplicationField;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\QueryException;

beforeEach(function () {
    $this->acme = Organization::factory()->create();
    $this->actingAs(User::factory()->for($this->acme)->create());
    $this->job = Job::factory()->for($this->acme)->create();
});

test('a job exposes its fields ordered by order', function () {
    ApplicationField::factory()->for($this->job)->create(['key' => 'c', 'order' => 2]);
    ApplicationField::factory()->for($this->job)->create(['key' => 'a', 'order' => 0]);
    ApplicationField::factory()->for($this->job)->create(['key' => 'b', 'order' => 1]);

    expect($this->job->applicationFields->pluck('key')->all())->toBe(['a', 'b', 'c']);
});

test('a field belongs to its job', function () {
    $field = ApplicationField::factory()->for($this->job)->create();

    expect($field->job->is($this->job))->toBeTrue();
});

test('type options and required cast correctly', function () {
    $field = ApplicationField::factory()->for($this->job)
        ->type(FieldType::Select)
        ->required()
        ->create();

    $field->refresh();

    expect($field->type)->toBe(FieldType::Select)
        ->and($field->required)->toBeTrue()
        ->and($field->options)->toBe(['one', 'two', 'three']);
});

test('key is unique per job at the database level', function () {
    ApplicationField::factory()->for($this->job)->create(['key' => 'years_experience']);

    expect(fn () => ApplicationField::factory()->for($this->job)->create(['key' => 'years_experience']))
        ->toThrow(QueryException::class);
});

test('the same key may exist on a different job', function () {
    $other = Job::factory()->for($this->acme)->create();

    ApplicationField::factory()->for($this->job)->create(['key' => 'years_experience']);
    $second = ApplicationField::factory()->for($other)->create(['key' => 'years_experience']);

    expect($second->exists)->toBeTrue();
});
