<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('cv');
});

function cvUploadPayload(array $overrides = []): array
{
    return array_merge([
        'filename' => 'resume.pdf',
        'content_type' => 'application/pdf',
        'size' => 120_000,
    ], $overrides);
}

test('upload-init returns an upload target with a cv key', function () {
    $this->postJson('/api/public/uploads/cv', cvUploadPayload())
        ->assertCreated()
        ->assertJsonStructure(['key', 'url', 'method', 'headers'])
        ->assertJsonPath('method', 'PUT');

    $key = $this->postJson('/api/public/uploads/cv', cvUploadPayload())->json('key');
    expect($key)->toStartWith('cv/');
});

test('upload-init requires no authentication', function () {
    $this->postJson('/api/public/uploads/cv', cvUploadPayload())->assertCreated();
});

test('upload-init rejects a disallowed content type', function () {
    $this->postJson('/api/public/uploads/cv', cvUploadPayload(['content_type' => 'application/x-msdownload']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content_type']);
});

test('upload-init rejects an oversize declared size', function () {
    $this->postJson('/api/public/uploads/cv', cvUploadPayload(['size' => 999_999_999]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['size']);
});

test('upload-init requires all fields with the standard 422 shape', function () {
    $this->postJson('/api/public/uploads/cv', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['filename', 'content_type', 'size'])
        ->assertJsonStructure(['message', 'errors']);
});

test('the local signed PUT stores the file on the cv disk', function () {
    $target = $this->postJson('/api/public/uploads/cv', cvUploadPayload())->json();

    $this->call('PUT', $target['url'], [], [], [], [], '%PDF-1.4 fake pdf bytes')
        ->assertOk();

    Storage::disk('cv')->assertExists($target['key']);
});

test('the local signed PUT rejects a tampered signature', function () {
    $target = $this->postJson('/api/public/uploads/cv', cvUploadPayload())->json();

    $this->call('PUT', $target['url'].'tampered', [], [], [], [], 'bytes')
        ->assertForbidden();
});

test('the local signed PUT rejects an oversize body', function () {
    $target = $this->postJson('/api/public/uploads/cv', cvUploadPayload())->json();
    $tooBig = str_repeat('a', (int) config('cv.max_bytes') + 1);

    $this->call('PUT', $target['url'], [], [], [], [], $tooBig)
        ->assertStatus(422);
});
