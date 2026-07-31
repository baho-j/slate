<?php

namespace App\Actions;

use App\Models\Application;
use App\Models\Candidate;
use App\Models\Job;
use App\Services\CvStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitApplication
{
    public function __construct(
        private readonly CvStorage $cv,
        private readonly EnsureDefaultPipeline $pipelines,
    ) {}

    /**
     * @param  array{full_name: string, email: string, cover_note: ?string, cv_key: string, cv_original_name: string}  $data
     */
    public function handle(Job $job, array $data): Application
    {
        $verification = $this->cv->verify($data['cv_key']);
        if (! $verification->ok) {
            throw ValidationException::withMessages(['cv_key' => $verification->error]);
        }

        $firstStage = $this->pipelines->forOrganization($job->organization)->stages()->first();

        return DB::transaction(function () use ($job, $data, $verification, $firstStage) {
            $candidate = Candidate::firstOrCreate(
                ['email' => $data['email']],
                ['full_name' => $data['full_name']],
            );

            $alreadyApplied = $job->applications()
                ->withoutGlobalScopes()
                ->where('candidate_id', $candidate->id)
                ->exists();

            if ($alreadyApplied) {
                abort(409, 'You have already applied to this job.');
            }

            $application = $job->applications()->make([
                'candidate_id' => $candidate->id,
                'current_stage_id' => $firstStage?->id,
                'cover_note' => $data['cover_note'] ?? null,
            ]);
            $application->organization_id = $job->organization_id;
            $application->save();

            $application->documents()->create([
                'kind' => 'cv',
                'blob_path' => $data['cv_key'],
                'original_name' => $data['cv_original_name'],
                'mime' => $verification->mime,
                'size_bytes' => $verification->size,
            ]);

            $application->statusHistory()->create([
                'to_stage_id' => $firstStage?->id,
                'to_status' => $application->status->value,
                'note' => 'Application submitted.',
            ]);

            return $application;
        });
    }
}
