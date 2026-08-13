<?php

use App\Notifications\ApplicationReceived;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    config()->set('mail.default', 'acs');
    config()->set('mail.mailers.acs', [
        'transport' => 'acs',
        'endpoint' => 'https://slate-acs.europe.communication.azure.com/',
        'key' => base64_encode('super-secret-signing-key'),
    ]);
    config()->set('mail.from', ['address' => 'donotreply@slate.azurecomm.net', 'name' => 'Slate']);
});

test('the ACS mailer signs the request and posts to the emails endpoint', function () {
    Http::fake([
        '*/emails:send*' => Http::response(['id' => 'op-1'], 202),
    ]);

    Notification::route('mail', 'candidate@example.com')
        ->notify(new ApplicationReceived(makeApplicationForMail()));

    Http::assertSent(function ($request) {
        $auth = $request->header('Authorization')[0] ?? '';
        $body = $request->data();

        return str_contains($request->url(), '/emails:send')
            && str_starts_with($auth, 'HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=')
            && ($request->header('x-ms-content-sha256')[0] ?? '') !== ''
            && $body['senderAddress'] === 'donotreply@slate.azurecomm.net'
            && $body['recipients']['to'][0]['address'] === 'candidate@example.com'
            && $body['content']['subject'] !== '';
    });
});

test('a non-2xx ACS response surfaces as a failure the queue can retry', function () {
    Http::fake([
        '*/emails:send*' => Http::response(['error' => 'throttled'], 429),
    ]);

    expect(fn () => Notification::route('mail', 'candidate@example.com')
        ->notify(new ApplicationReceived(makeApplicationForMail())))
        ->toThrow(RequestException::class);
});
