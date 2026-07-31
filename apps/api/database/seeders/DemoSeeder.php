<?php

namespace Database\Seeders;

use App\Actions\EnsureDefaultPipeline;
use App\Enums\UserRole;
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

        $pipelines = app(EnsureDefaultPipeline::class);
        $pipelines->forOrganization($acme);
        $pipelines->forOrganization($globex);

        $this->user('admin@slate.test', 'Ada Admin', UserRole::SuperAdmin, null);
        $this->user('candidate@slate.test', 'Cora Candidate', UserRole::Candidate, null);

        $this->user('hr@slate.test', 'Hana HR', UserRole::HrManager, $acme);
        $this->user('recruiter@slate.test', 'Remy Recruiter', UserRole::Recruiter, $acme);
        $this->user('interviewer@slate.test', 'Ivan Interviewer', UserRole::Interviewer, $acme);

        $this->user('hr@globex.test', 'Gwen Globex', UserRole::HrManager, $globex);
        $this->user('recruiter@globex.test', 'Greg Globex', UserRole::Recruiter, $globex);
        $this->user('interviewer@globex.test', 'Gina Globex', UserRole::Interviewer, $globex);
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

    private function user(string $email, string $name, UserRole $role, ?Organization $organization): void
    {
        User::firstOrCreate(
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
}
