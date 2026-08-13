<?php

use App\Notifications\ApplicationReceived;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

test('a notification that keeps failing lands in failed_jobs after its retries', function () {
    // Drive the real database queue instead of the sync driver so the worker,
    // retry accounting, and failed_jobs table all exercise for real.
    config()->set('queue.default', 'database');
    config()->set('mail.default', 'acs');
    config()->set('mail.mailers.acs', [
        'transport' => 'acs',
        'endpoint' => 'https://slate-acs.example.com/',
        'key' => base64_encode('key'),
    ]);
    config()->set('mail.from', ['address' => 'donotreply@slate.azurecomm.net', 'name' => 'Slate']);

    Http::fake(['*/emails:send*' => Http::response(['error' => 'boom'], 500)]);

    $application = makeApplicationForMail();

    Notification::route('mail', 'candidate@example.com')
        ->notify(new ApplicationReceived($application));

    // One queued job is waiting.
    expect(Queue::size())->toBe(1);

    // Work it with a single try; it fails and is recorded, not retried forever.
    $this->artisan('queue:work', [
        '--once' => true,
        '--tries' => 1,
        '--no-interaction' => true,
    ])->assertExitCode(0);

    $this->assertDatabaseCount('failed_jobs', 1);
    expect(Queue::size())->toBe(0);
});
