<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobApplication extends Model
{
    protected $fillable = [
        'job_posting_id', 'application_number', 'first_name', 'last_name', 'email', 'phone',
        'application_date', 'status', 'cv_path', 'cover_letter_path',
        'overall_score', 'notes', 'is_internal', 'employee_id',
    ];

    protected $casts = [
        'application_date' => 'date',
        'overall_score'    => 'decimal:2',
        'is_internal'      => 'boolean',
    ];

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ApplicationDocument::class, 'application_id');
    }

    public function interviews(): HasMany
    {
        return $this->hasMany(Interview::class, 'application_id');
    }
}
