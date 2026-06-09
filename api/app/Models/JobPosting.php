<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobPosting extends Model
{
    protected $fillable = [
        'recruitment_request_id', 'department_id', 'title', 'location', 'supervisor_id',
        'description', 'missions', 'responsibilities', 'education_level', 'required_diplomas',
        'required_experience_years', 'technical_skills', 'behavioral_skills',
        'required_certifications', 'required_languages', 'publication_type',
        'status', 'published_at', 'closing_date', 'created_by',
    ];

    protected $casts = [
        'technical_skills'  => 'array',
        'behavioral_skills' => 'array',
        'required_languages' => 'array',
        'published_at'      => 'datetime',
        'closing_date'      => 'date',
    ];

    public function recruitmentRequest(): BelongsTo
    {
        return $this->belongsTo(RecruitmentRequest::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'supervisor_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function criteria(): HasMany
    {
        return $this->hasMany(JobPostingCriterion::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    public function interviews(): HasMany
    {
        return $this->hasMany(Interview::class);
    }
}
