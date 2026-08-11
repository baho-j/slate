<?php

namespace Database\Seeders;

use App\Actions\EnsureDefaultPipeline;
use App\Enums\CriterionMode;
use App\Enums\CriterionOperator;
use App\Enums\FieldType;
use App\Enums\JobStatus;
use App\Enums\UserRole;
use App\Models\Job;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
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

        app(EnsureDefaultPipeline::class)->forJob($job);

        return $job;
    }

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
