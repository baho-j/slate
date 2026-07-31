<?php

use App\Services\CvStorage;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('cv');
    $this->cv = app(CvStorage::class);
});

test('a real pdf passes verification', function () {
    $pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
    Storage::disk('cv')->put('cv/good.pdf', $pdf);

    $result = $this->cv->verify('cv/good.pdf');

    expect($result->ok)->toBeTrue()
        ->and($result->mime)->toBe('application/pdf');
});

test('a forged content-type is rejected on the actual bytes', function () {
    Storage::disk('cv')->put('cv/evil.pdf', "#!/bin/sh\necho pwned\n");

    $result = $this->cv->verify('cv/evil.pdf');

    expect($result->ok)->toBeFalse()
        ->and($result->error)->toContain('accepted document type');
});

test('an oversize file is rejected', function () {
    config()->set('cv.max_bytes', 10);
    Storage::disk('cv')->put('cv/big.pdf', '%PDF-1.4 this is more than ten bytes');

    $result = $this->cv->verify('cv/big.pdf');

    expect($result->ok)->toBeFalse()
        ->and($result->error)->toContain('too large');
});

test('a missing key is rejected', function () {
    $result = $this->cv->verify('cv/nope.pdf');

    expect($result->ok)->toBeFalse()
        ->and($result->error)->toContain('could not be found');
});
