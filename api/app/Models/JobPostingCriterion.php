<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobPostingCriterion extends Model
{
    protected $table = 'job_posting_criteria';

    protected $fillable = [
        'job_posting_id', 'name', 'weight', 'minimum_level', 'is_eliminatory',
    ];

    protected $casts = [
        'is_eliminatory' => 'boolean',
    ];

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(InterviewEvaluation::class, 'criterion_id');
    }
}
