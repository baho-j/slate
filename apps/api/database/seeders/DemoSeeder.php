<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::firstOrCreate(
            ['slug' => 'acme'],
            [
                'name' => 'Acme Inc.',
                'description' => 'Demo organization for evaluating Slate.',
                'website' => 'https://acme.test',
            ],
        );

        $accounts = [
            ['admin@slate.test', 'Ada Admin', UserRole::SuperAdmin, null],
            ['hr@slate.test', 'Hana HR', UserRole::HrManager, $organization->id],
            ['recruiter@slate.test', 'Remy Recruiter', UserRole::Recruiter, $organization->id],
            ['interviewer@slate.test', 'Ivan Interviewer', UserRole::Interviewer, $organization->id],
            ['candidate@slate.test', 'Cora Candidate', UserRole::Candidate, null],
        ];

        foreach ($accounts as [$email, $name, $role, $organizationId]) {
            User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make('password'),
                    'role' => $role,
                    'organization_id' => $organizationId,
                    'email_verified_at' => now(),
                ],
            );
        }
    }
}
