<?php

namespace App\Models;

use App\Enums\EmploymentType;
use App\Enums\JobStatus;
use App\Models\Concerns\HasOrganization;
use Database\Factories\JobFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

#[Fillable([
    'title', 'description', 'department', 'location', 'employment_type',
    'salary_min', 'salary_max', 'currency', 'status', 'closing_date',
])]
class Job extends Model
{
    /** @use HasFactory<JobFactory> */
    use HasFactory, HasUuids;

    use HasOrganization;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => JobStatus::Draft->value,
    ];

    protected static function booted(): void
    {
        static::creating(function (Job $job) {
            $job->created_by ??= Auth::id();
        });
    }

    protected function casts(): array
    {
        return [
            'employment_type' => EmploymentType::class,
            'status' => JobStatus::class,
            'closing_date' => 'date',
            'salary_min' => 'integer',
            'salary_max' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /** @return HasMany<ApplicationField, $this> */
    public function applicationFields(): HasMany
    {
        return $this->hasMany(ApplicationField::class)->orderBy('order');
    }

    /** @return HasMany<ScreeningCriterion, $this> */
    public function screeningCriteria(): HasMany
    {
        return $this->hasMany(ScreeningCriterion::class);
    }
}
