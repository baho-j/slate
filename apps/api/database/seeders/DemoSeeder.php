<?php

namespace Database\Seeders;

use App\Actions\EnsureDefaultPipeline;
use App\Enums\ApplicationStatus;
use App\Enums\CriterionMode;
use App\Enums\CriterionOperator;
use App\Enums\FieldType;
use App\Enums\JobStatus;
use App\Enums\UserRole;
use App\Models\Candidate;
use App\Models\Job;
use App\Models\Organization;
use App\Models\PipelineStage;
use App\Models\ScreeningCriterion;
use App\Models\User;
use App\Services\Criteria\CriteriaEvaluator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $acme = $this->organization('acme', 'Acme Inc.', 'https://acme.test');
        $globex = $this->organization('globex', 'Globex Corporation', 'https://globex.test');

        $this->user('admin@slate.test', 'Ada Admin', UserRole::SuperAdmin, null);
        $this->user('candidate@slate.test', 'Cora Candidate', UserRole::Candidate, null);

        $hana = $this->user('hr@slate.test', 'Hana HR', UserRole::HrManager, $acme);
        $this->user('recruiter@slate.test', 'Remy Recruiter', UserRole::Recruiter, $acme);
        $this->user('interviewer@slate.test', 'Ivan Interviewer', UserRole::Interviewer, $acme);

        $this->user('hr@globex.test', 'Gwen Globex', UserRole::HrManager, $globex);
        $this->user('recruiter@globex.test', 'Greg Globex', UserRole::Recruiter, $globex);
        $this->user('interviewer@globex.test', 'Gina Globex', UserRole::Interviewer, $globex);

        $this->jobWithFields($acme, $hana, 'Senior Backend Engineer', 'Engineering');
        $this->jobWithFields($acme, $hana, 'Product Designer', 'Design');
    }

    private function organization(string $slug, string $name, string $website): Organization
    {
        return Organization::firstOrCreate(
            ['slug' => $slug],
            [
                'name' => $name,
                'description' => "Demo organization for evaluating Slate ({$name}).",
                'website' => $website,
            ],
        );
    }

    private function user(string $email, string $name, UserRole $role, ?Organization $organization): User
    {
        return User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make('password'),
                'role' => $role,
                'organization_id' => $organization?->id,
                'email_verified_at' => now(),
            ],
        );
    }

    private function jobWithFields(Organization $organization, User $creator, string $title, string $department): Job
    {
        $job = Job::withoutGlobalScopes()->firstOrCreate(
            ['organization_id' => $organization->id, 'title' => $title],
            [
                'created_by' => $creator->id,
                'description' => "We are hiring a {$title}. Apply through Slate.",
                'department' => $department,
                'location' => 'Remote',
                'employment_type' => 'full_time',
                'currency' => 'USD',
                'status' => JobStatus::Published,
            ],
        );

        foreach ($this->demoFields() as $order => $field) {
            $job->applicationFields()->firstOrCreate(
                ['key' => $field['key']],
                array_merge($field, ['order' => $order]),
            );
        }

        foreach ($this->demoCriteria() as $rule) {
            $job->screeningCriteria()->firstOrCreate(
                ['field_key' => $rule['field_key'], 'operator' => $rule['operator']],
                $rule,
            );
        }

        $pipeline = app(EnsureDefaultPipeline::class)->forJob($job);

        $this->applications($job, $pipeline->stages()->get());

        return $job;
    }

    /**
     * @param  Collection<int, PipelineStage>  $stages
     */
    private function applications(Job $job, Collection $stages): void
    {
        if ($stages->isEmpty() || $job->applications()->withoutGlobalScopes()->exists()) {
            return;
        }

        $evaluator = app(CriteriaEvaluator::class);
        $rules = $job->screeningCriteria()->get()
            ->map(fn (ScreeningCriterion $rule) => [
                'field_key' => $rule->field_key,
                'operator' => $rule->operator,
                'value' => $rule->value,
                'mode' => $rule->mode,
                'weight' => $rule->weight,
            ])
            ->all();

        $fields = $job->applicationFields()->get()->keyBy('key');
        $open = $stages->where('is_terminal', false)->values();

        foreach ($this->demoApplicants() as $index => $applicant) {
            $candidate = Candidate::firstOrCreate(
                ['email' => $applicant['email']],
                ['full_name' => $applicant['full_name']],
            );

            $evaluation = $evaluator->evaluate($rules, $applicant['answers']);
            $stage = $open->get($index % max($open->count(), 1)) ?? $stages->first();

            $application = $job->applications()->make([
                'candidate_id' => $candidate->id,
                'current_stage_id' => $stage->id,
                'eligibility' => $evaluation->eligibility,
                'match_score' => $evaluation->matchScore,
                'status' => ApplicationStatus::Applied,
            ]);
            $application->organization_id = $job->organization_id;
            $application->save();

            foreach ($applicant['answers'] as $key => $value) {
                $application->answers()->create([
                    'field_id' => $fields->get($key)?->id,
                    'field_key' => $key,
                    'value' => $value,
                ]);
            }

            $application->statusHistory()->create([
                'to_stage_id' => $stage->id,
                'to_status' => ApplicationStatus::Applied->value,
                'note' => 'Application submitted.',
            ]);
        }
    }

    /**
     * @return array<int, array{full_name: string, email: string, answers: array<string, mixed>}>
     */
    private function demoApplicants(): array
    {
        $skills = [['php', 'react'], ['php'], ['react', 'go'], ['php', 'react', 'sql'], ['python']];
        $degrees = ['bsc', 'msc', 'phd', 'none'];

        return collect(range(1, 16))
            ->map(fn (int $n) => [
                'full_name' => self::NAMES[($n - 1) % count(self::NAMES)].' '
                    .self::SURNAMES[intdiv($n - 1, count(self::NAMES)) % count(self::SURNAMES)],
                'email' => 'candidate'.$n.'@example.test',
                'answers' => [
                    'years_experience' => 1 + ($n % 9),
                    'has_work_permit' => $n % 5 !== 0,
                    'skills' => $skills[($n - 1) % count($skills)],
                    'degree' => $degrees[($n - 1) % count($degrees)],
                ],
            ])
            ->all();
    }

    private const NAMES = ['Amara', 'Bram', 'Chidi', 'Dalia', 'Eero', 'Freya', 'Goran', 'Hina'];

    private const SURNAMES = ['Okafor', 'Lindqvist', 'Mensah', 'Haddad', 'Virtanen', 'Nowak', 'Petrov', 'Tanaka'];

    /**
     * @return array<int, array<string, mixed>>
     */
    private function demoFields(): array
    {
        return [
            ['label' => 'Years of experience', 'key' => 'years_experience', 'type' => FieldType::Number->value, 'required' => true, 'options' => null],
            ['label' => 'Do you have a work permit?', 'key' => 'has_work_permit', 'type' => FieldType::Boolean->value, 'required' => true, 'options' => null],
            ['label' => 'Skills', 'key' => 'skills', 'type' => FieldType::Multiselect->value, 'required' => false, 'options' => ['php', 'react', 'go', 'python', 'sql']],
            ['label' => 'Highest degree', 'key' => 'degree', 'type' => FieldType::Select->value, 'required' => false, 'options' => ['none', 'bsc', 'msc', 'phd']],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function demoCriteria(): array
    {
        return [
            ['field_key' => 'years_experience', 'operator' => CriterionOperator::Gte->value, 'value' => 3, 'mode' => CriterionMode::Knockout->value, 'weight' => null],
            ['field_key' => 'has_work_permit', 'operator' => CriterionOperator::Eq->value, 'value' => true, 'mode' => CriterionMode::Knockout->value, 'weight' => null],
            ['field_key' => 'skills', 'operator' => CriterionOperator::IncludesAll->value, 'value' => ['php', 'react'], 'mode' => CriterionMode::Scored->value, 'weight' => 30],
            ['field_key' => 'degree', 'operator' => CriterionOperator::In->value, 'value' => ['bsc', 'msc'], 'mode' => CriterionMode::Scored->value, 'weight' => 20],
        ];
    }
}
