<?php

namespace App\Actions;

use App\Enums\ApplicationStatus;
use App\Enums\Eligibility;
use App\Enums\IneligibleHandling;
use App\Models\Application;
use App\Models\ApplicationAnswer;
use App\Models\ApplicationField;
use App\Models\Candidate;
use App\Models\Job;
use App\Services\Criteria\CriteriaEvaluator;
use App\Services\Criteria\Evaluation;
use App\Services\CvStorage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitApplication
{
    public function __construct(
        private readonly CvStorage $cv,
        private readonly EnsureDefaultPipeline $pipelines,
        private readonly CriteriaEvaluator $evaluator,
    ) {}

    /**
     * @param  array{full_name: string, email: string, cover_note: ?string, cv_key: string, cv_original_name: string, answers?: array<string, mixed>}  $data
     */
    public function handle(Job $job, array $data): Application
    {
        $verification = $this->cv->verify($data['cv_key']);
        if (! $verification->ok) {
            throw ValidationException::withMessages(['cv_key' => $verification->error]);
        }

        $firstStage = $this->pipelines->forJob($job)->stages()->first();
        $fields = $job->applicationFields()->get();
        $answers = $this->answersForFields($fields, $data['answers'] ?? []);
        $evaluation = $this->evaluator->evaluate($this->rulesFor($job), $answers);

        return DB::transaction(function () use ($job, $data, $verification, $firstStage, $fields, $answers, $evaluation) {
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

            $rejected = $evaluation->eligibility === Eligibility::Ineligible
                && $job->on_ineligible === IneligibleHandling::Reject;

            $application = $job->applications()->make([
                'candidate_id' => $candidate->id,
                'current_stage_id' => $firstStage?->id,
                'cover_note' => $data['cover_note'] ?? null,
                'eligibility' => $evaluation->eligibility,
                'match_score' => $evaluation->matchScore,
                'status' => $rejected ? ApplicationStatus::Rejected : ApplicationStatus::Applied,
            ]);
            $application->organization_id = $job->organization_id;
            $application->save();

            $this->storeAnswers($application, $fields, $answers);

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
                'note' => $this->submissionNote($evaluation),
            ]);

            return $application;
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function rulesFor(Job $job): array
    {
        return $job->screeningCriteria()
            ->get()
            ->map(fn ($rule) => [
                'field_key' => $rule->field_key,
                'operator' => $rule->operator,
                'value' => $rule->value,
                'mode' => $rule->mode,
                'weight' => $rule->weight,
            ])
            ->all();
    }

    /**
     * @param  Collection<int, ApplicationField>  $fields
     * @param  array<string, mixed>  $submitted
     * @return array<string, mixed>
     */
    private function answersForFields(Collection $fields, array $submitted): array
    {
        return $fields
            ->filter(fn (ApplicationField $field) => array_key_exists($field->key, $submitted))
            ->mapWithKeys(fn (ApplicationField $field) => [$field->key => $submitted[$field->key]])
            ->all();
    }

    /**
     * @param  Collection<int, ApplicationField>  $fields
     * @param  array<string, mixed>  $answers
     */
    private function storeAnswers(Application $application, Collection $fields, array $answers): void
    {
        $now = now();

        $rows = $fields
            ->filter(fn (ApplicationField $field) => array_key_exists($field->key, $answers))
            ->map(fn (ApplicationField $field) => [
                'application_id' => $application->id,
                'field_id' => $field->id,
                'field_key' => $field->key,
                'value' => json_encode($answers[$field->key]),
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->all();

        if ($rows !== []) {
            ApplicationAnswer::insert($rows);
        }
    }

    private function submissionNote(Evaluation $evaluation): string
    {
        return match ($evaluation->eligibility) {
            Eligibility::Ineligible => 'Application submitted. Screening: ineligible.',
            Eligibility::Manual => 'Application submitted. Screening: needs manual review.',
            Eligibility::Eligible => 'Application submitted. Screening: eligible.',
        };
    }
}
