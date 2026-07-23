<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\Fixtures\OrgOwnedRecord;

beforeEach(function () {
    Schema::create('org_owned_records', function (Blueprint $table) {
        $table->id();
        $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
        $table->string('name');
        $table->timestamps();
    });

    $this->acme = Organization::factory()->create(['name' => 'Acme']);
    $this->globex = Organization::factory()->create(['name' => 'Globex']);

    $this->acmeRecord = OrgOwnedRecord::withoutGlobalScopes()->create([
        'organization_id' => $this->acme->id,
        'name' => 'acme record',
    ]);

    $this->globexRecord = OrgOwnedRecord::withoutGlobalScopes()->create([
        'organization_id' => $this->globex->id,
        'name' => 'globex record',
    ]);
});

test('a query returns only the acting user own organization rows', function () {
    $this->actingAs(User::factory()->for($this->acme)->create());

    $names = OrgOwnedRecord::pluck('name');

    expect($names)->toContain('acme record')
        ->and($names)->not->toContain('globex record');
});

test('another org row is not reachable by direct id lookup', function () {
    $this->actingAs(User::factory()->for($this->acme)->create());

    expect(OrgOwnedRecord::find($this->globexRecord->id))->toBeNull();
});

test('a super admin sees every organization rows', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    expect(OrgOwnedRecord::count())->toBe(2);
});

test('a guest sees no org owned rows', function () {
    expect(OrgOwnedRecord::count())->toBe(0);
});

test('a candidate without an organization sees no org owned rows', function () {
    $this->actingAs(User::factory()->candidate()->create());

    expect(OrgOwnedRecord::count())->toBe(0);
});

test('creating a record assigns the acting user organization automatically', function () {
    $this->actingAs(User::factory()->for($this->acme)->create());

    $record = OrgOwnedRecord::create(['name' => 'new record']);

    expect($record->organization_id)->toBe($this->acme->id);
});

test('the scope can be bypassed explicitly for trusted system queries', function () {
    $this->actingAs(User::factory()->for($this->acme)->create());

    expect(OrgOwnedRecord::withoutGlobalScopes()->count())->toBe(2);
});
