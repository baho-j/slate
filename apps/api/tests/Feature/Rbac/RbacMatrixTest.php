<?php

use App\Actions\EnsureDefaultPipeline;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Interview;
use App\Models\Job;
use App\Models\Organization;
use App\Models\TalentPoolEntry;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/**
 * A single org (acme) with one user per role and one of every protected resource.
 * `assigned` links the interviewer to their interview and the candidate to their
 * application, so the "own/assigned" boundaries are exercisable.
 */
function rbacWorld(): array
{
    $acme = Organization::factory()->create();

    $users = [
        'super_admin' => User::factory()->for($acme)->role(UserRole::SuperAdmin)->create(),
        'hr_manager' => User::factory()->for($acme)->role(UserRole::HrManager)->create(),
        'recruiter' => User::factory()->for($acme)->role(UserRole::Recruiter)->create(),
        'interviewer' => User::factory()->for($acme)->role(UserRole::Interviewer)->create(),
        'candidate' => User::factory()->for($acme)->role(UserRole::Candidate)->create(),
    ];

    $job = Job::factory()->for($acme)->published()->create();
    $stage = app(EnsureDefaultPipeline::class)->forJob($job)->stages()->first();

    // The application belongs to the candidate user, and the interview is assigned to
    // the interviewer user — the two "read only your own/assigned" boundaries.
    $candidate = Candidate::factory()->create(['user_id' => $users['candidate']->id]);
    $application = Application::factory()->for($job)->for($candidate)->create(['current_stage_id' => $stage->id]);
    $document = $application->documents()->create([
        'kind' => 'cv',
        'blob_path' => 'cv/'.Str::uuid().'.pdf',
        'original_name' => 'cv.pdf',
        'mime' => 'application/pdf',
        'size_bytes' => 1024,
    ]);

    $interview = Interview::factory()->for($application)->create(['interviewer_id' => $users['interviewer']->id]);
    $evaluationInterview = Interview::factory()->for($application)->create(['interviewer_id' => $users['interviewer']->id]);

    $poolEntry = TalentPoolEntry::factory()->for($acme)->create(['candidate_id' => $candidate->id]);

    return compact('acme', 'users', 'job', 'stage', 'application', 'document', 'interview', 'evaluationInterview', 'poolEntry');
}

/**
 * Every authenticated route with the roles allowed to reach it. A role not listed
 * must be refused with 403 (401 for no auth). `super_admin` is allowed everywhere
 * via each policy's before() hook, so it's implied and asserted separately.
 *
 * Each entry: [method, url(fn), allowed[], body(fn)].
 */
function rbacMatrix(array $w): array
{
    $recruiterPlus = ['hr_manager', 'recruiter'];
    $staff = ['hr_manager', 'recruiter', 'interviewer'];
    $everyone = ['hr_manager', 'recruiter', 'interviewer', 'candidate'];
    $jobId = $w['job']->id;
    $appId = $w['application']->id;

    return [
        'GET jobs' => ['get', '/api/jobs', $recruiterPlus, null],
        'POST jobs' => ['post', '/api/jobs', $recruiterPlus, fn () => jobPayload()],
        'GET jobs/{job}' => ['get', "/api/jobs/{$jobId}", $recruiterPlus, null],
        'PUT jobs/{job}' => ['put', "/api/jobs/{$jobId}", $recruiterPlus, fn () => jobPayload()],
        'PATCH jobs/{job}' => ['patch', "/api/jobs/{$jobId}", $recruiterPlus, fn () => jobPayload()],
        'DELETE jobs/{job}' => ['delete', "/api/jobs/{$jobId}", $recruiterPlus, null],
        'POST jobs/{job}/publish' => ['post', "/api/jobs/{$jobId}/publish", $recruiterPlus, null],
        'POST jobs/{job}/close' => ['post', "/api/jobs/{$jobId}/close", $recruiterPlus, null],
        'GET jobs/{job}/fields' => ['get', "/api/jobs/{$jobId}/fields", $recruiterPlus, null],
        'PUT jobs/{job}/fields' => ['put', "/api/jobs/{$jobId}/fields", $recruiterPlus, fn () => ['fields' => []]],
        'GET jobs/{job}/criteria' => ['get', "/api/jobs/{$jobId}/criteria", $recruiterPlus, null],
        'PUT jobs/{job}/criteria' => ['put', "/api/jobs/{$jobId}/criteria", $recruiterPlus, fn () => ['criteria' => []]],
        'GET jobs/{job}/pipeline' => ['get', "/api/jobs/{$jobId}/pipeline", $recruiterPlus, null],
        'PUT jobs/{job}/pipeline' => ['put', "/api/jobs/{$jobId}/pipeline", ['hr_manager'], fn () => pipelinePayload()],
        'GET jobs/{job}/applications' => ['get', "/api/jobs/{$jobId}/applications", $recruiterPlus, null],
        'GET applications/{application}' => ['get', "/api/applications/{$appId}", ['hr_manager', 'recruiter', 'interviewer', 'candidate'], null],
        'PATCH applications/{application}/stage' => ['patch', "/api/applications/{$appId}/stage", $recruiterPlus, fn () => ['stage_id' => $w['stage']->id]],
        'GET applications/{application}/documents/{document}/url' => ['get', "/api/applications/{$appId}/documents/{$w['document']->id}/url", ['hr_manager', 'recruiter', 'interviewer', 'candidate'], null],
        'GET interviewers' => ['get', '/api/interviewers', $recruiterPlus, null],
        // A personal list scoped to the caller's own assignments — never a 403, just empty.
        'GET interviews/mine' => ['get', '/api/interviews/mine', $everyone, null],
        'POST applications/{application}/interviews' => ['post', "/api/applications/{$appId}/interviews", $recruiterPlus, fn () => interviewPayload($w)],
        'PATCH interviews/{interview}' => ['patch', "/api/interviews/{$w['interview']->id}", $recruiterPlus, fn () => ['location' => 'Remote']],
        'POST interviews/{interview}/evaluation' => ['post', "/api/interviews/{$w['evaluationInterview']->id}/evaluation", ['interviewer'], fn () => ['rating' => 4, 'recommendation' => 'yes']],
        'GET analytics/overview' => ['get', '/api/analytics/overview', $recruiterPlus, null],
        'GET analytics/jobs/{job}' => ['get', "/api/analytics/jobs/{$jobId}", $recruiterPlus, null],
        'GET organizations/current' => ['get', '/api/organizations/current', $everyone, null],
        'PATCH organizations/current' => ['patch', '/api/organizations/current', ['hr_manager'], fn () => ['name' => 'Renamed']],
        'POST uploads/logo' => ['post', '/api/uploads/logo', ['hr_manager'], fn () => ['filename' => 'l.png', 'content_type' => 'image/png', 'size' => 1024]],
        'GET talent-pool' => ['get', '/api/talent-pool', $recruiterPlus, null],
        'POST talent-pool' => ['post', '/api/talent-pool', $recruiterPlus, fn () => ['candidate_id' => $w['application']->candidate_id]],
        'DELETE talent-pool/{talentPoolEntry}' => ['delete', "/api/talent-pool/{$w['poolEntry']->id}", $recruiterPlus, null],
        'GET users' => ['get', '/api/users', ['hr_manager'], null],
        'POST users' => ['post', '/api/users', ['hr_manager'], fn () => ['name' => 'New', 'email' => 'new'.Str::random(6).'@acme.test', 'role' => 'recruiter']],
        'PATCH users/{user}' => ['patch', fn ($w) => "/api/users/{$w['users']['recruiter']->id}", ['hr_manager'], fn () => ['name' => 'Renamed']],
        'DELETE users/{user}' => ['delete', fn ($w) => "/api/users/{$w['users']['interviewer']->id}", ['hr_manager'], null],
    ];
}

function jobPayload(): array
{
    return [
        'title' => 'Matrix Role',
        'description' => 'A role for the matrix.',
        'employment_type' => 'full_time',
    ];
}

function pipelinePayload(): array
{
    return [
        'stages' => [
            ['name' => 'Applied', 'is_terminal' => false],
            ['name' => 'Hired', 'is_terminal' => true],
        ],
    ];
}

function interviewPayload(array $w): array
{
    return [
        'interviewer_id' => $w['users']['interviewer']->id,
        'scheduled_at' => now()->addWeek()->toIso8601String(),
    ];
}

function resolveUrl(array $entry, array $w): string
{
    return is_callable($entry[1]) ? $entry[1]($w) : $entry[1];
}

/** The matrix route names, independent of any seeded world. */
function rbacMatrixNames(): array
{
    return array_keys(rbacMatrix(rbacWorld()));
}

test('every authenticated route is covered by the matrix', function () {
    $w = rbacWorld();

    // The matrix keys are canonical "METHOD template" strings (without the api/ prefix).
    $matrixKeys = collect(rbacMatrix($w))->keys()->map('paramShape')->sort()->values();

    // Every authenticated api route, minus the auth-identity endpoints which aren't RBAC-gated.
    $authRoutes = collect(Route::getRoutes())
        ->filter(fn ($route) => str_starts_with($route->uri(), 'api/'))
        ->filter(fn ($route) => in_array('auth:sanctum', $route->gatherMiddleware(), true))
        ->reject(fn ($route) => in_array($route->uri(), ['api/auth/logout', 'api/auth/me'], true))
        ->flatMap(fn ($route) => collect($route->methods())
            ->reject(fn ($m) => in_array($m, ['HEAD', 'OPTIONS'], true))
            ->map(fn ($m) => paramShape($m.' '.substr($route->uri(), 4))))
        ->unique()
        ->sort()
        ->values();

    // A registered route with no matrix entry is a coverage hole; fix by adding the entry.
    expect($authRoutes->diff($matrixKeys)->values()->all())->toBe([]);
});

function paramShape(string $key): string
{
    return preg_replace('#\{[^}]*\}#', '{}', $key);
}

test('the matrix allows and denies each role correctly', function () {
    // The matrix is re-seeded per route so a destructive route in one entry can't consume
    // the fixtures a later entry relies on — every route sees a pristine world.
    foreach (rbacMatrixNames() as $name) {
        $w = rbacWorld();
        $entry = rbacMatrix($w)[$name];
        [$method, , $allowed] = $entry;
        $url = resolveUrl($entry, $w);
        $body = ($entry[3] ?? null) ? ($entry[3])() : [];

        $isAllowed = fn (string $role) => $role === 'super_admin' || in_array($role, $allowed, true);

        // Denied roles first: they 403 without mutating, so the resource stays present.
        $roles = collect($w['users'])->sortBy(fn ($u, $role) => $isAllowed($role) ? 1 : 0);

        foreach ($roles as $role => $user) {
            $status = test()->actingAs($user)->json(strtoupper($method), $url, $body)->getStatusCode();

            if ($isAllowed($role)) {
                expect($status)->not->toBe(403, "{$name} should allow {$role} (got {$status})");
                expect($status)->not->toBe(401, "{$name} should not 401 an authenticated {$role}");
            } else {
                expect($status)->toBe(403, "{$name} should forbid {$role} (got {$status})");
            }
        }
    }
});

test('an org-scoped resource returns 404 across orgs, never 403', function () {
    // 404 rather than 403 so a foreign org can't confirm a row exists.
    $w = rbacWorld();
    $outsider = User::factory()
        ->for(Organization::factory()->create())
        ->role(UserRole::HrManager)
        ->create();

    $jobId = $w['job']->id;
    $appId = $w['application']->id;

    $crossOrg = [
        'GET jobs/{job}' => ['get', "/api/jobs/{$jobId}"],
        'PUT jobs/{job}' => ['put', "/api/jobs/{$jobId}", jobPayload()],
        'DELETE jobs/{job}' => ['delete', "/api/jobs/{$jobId}"],
        'POST jobs/{job}/publish' => ['post', "/api/jobs/{$jobId}/publish"],
        'GET jobs/{job}/applications' => ['get', "/api/jobs/{$jobId}/applications"],
        'GET jobs/{job}/pipeline' => ['get', "/api/jobs/{$jobId}/pipeline"],
        'GET jobs/{job}/criteria' => ['get', "/api/jobs/{$jobId}/criteria"],
        'GET jobs/{job}/fields' => ['get', "/api/jobs/{$jobId}/fields"],
        'GET applications/{application}' => ['get', "/api/applications/{$appId}"],
        'PATCH applications/{application}/stage' => ['patch', "/api/applications/{$appId}/stage", ['stage_id' => $w['stage']->id]],
        'POST applications/{application}/interviews' => ['post', "/api/applications/{$appId}/interviews", interviewPayload($w)],
        'PATCH interviews/{interview}' => ['patch', "/api/interviews/{$w['interview']->id}", ['location' => 'X']],
        'DELETE talent-pool/{talentPoolEntry}' => ['delete', "/api/talent-pool/{$w['poolEntry']->id}"],
        'GET analytics/jobs/{job}' => ['get', "/api/analytics/jobs/{$jobId}"],
    ];

    foreach ($crossOrg as $name => [$method, $url]) {
        $body = $crossOrg[$name][2] ?? [];
        $status = test()->actingAs($outsider)->json(strtoupper($method), $url, $body)->getStatusCode();

        expect($status)->toBe(404, "{$name} must 404 across orgs (got {$status})");
    }
});

describe('the own/assigned application boundaries', function () {
    test('a candidate can read their own application but not another', function () {
        $w = rbacWorld();
        $ownApp = $w['application'];

        $otherCandidate = Candidate::factory()->create();
        $otherApp = Application::factory()->for($w['job'])->for($otherCandidate)->create();

        test()->actingAs($w['users']['candidate'])
            ->getJson("/api/applications/{$ownApp->id}")->assertOk();

        test()->actingAs($w['users']['candidate'])
            ->getJson("/api/applications/{$otherApp->id}")->assertForbidden();
    });

    test('an interviewer can read an assigned application but not an unassigned one', function () {
        $w = rbacWorld();
        $assignedApp = $w['application'];

        $otherApp = Application::factory()->for($w['job'])->for(Candidate::factory())->create();

        test()->actingAs($w['users']['interviewer'])
            ->getJson("/api/applications/{$assignedApp->id}")->assertOk();

        test()->actingAs($w['users']['interviewer'])
            ->getJson("/api/applications/{$otherApp->id}")->assertForbidden();
    });

    test('an interviewer can evaluate only their own assigned interview', function () {
        $w = rbacWorld();

        $colleagueInterview = Interview::factory()->for($w['application'])->create([
            'interviewer_id' => User::factory()->for($w['acme'])->role(UserRole::Interviewer)->create()->id,
        ]);

        test()->actingAs($w['users']['interviewer'])
            ->postJson("/api/interviews/{$colleagueInterview->id}/evaluation", ['rating' => 4, 'recommendation' => 'yes'])
            ->assertForbidden();
    });
});
