<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecruitmentRequest extends Model
{
    protected $fillable = [
        'department_id', 'position_title', 'number_of_positions', 'contract_type',
        'desired_start_date', 'justification', 'hierarchical_level', 'budget',
        'requested_by', 'status', 'rejection_reason', 'approved_by', 'approved_at',
    ];

    protected $casts = [
        'desired_start_date' => 'date',
        'approved_at'        => 'datetime',
        'budget'             => 'decimal:2',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function jobPostings(): HasMany
    {
        return $this->hasMany(JobPosting::class);
    }
}
