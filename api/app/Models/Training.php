<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Training extends Model
{
    protected $fillable = [
        'title', 'training_type_id', 'provider_id', 'is_internal',
        'objectives', 'justification', 'participants_count', 'desired_date',
        'duration_days', 'location', 'estimated_cost', 'funding_source',
        'cost_center_id', 'priority', 'status', 'approved_by', 'approved_at',
        'start_date', 'end_date', 'actual_cost', 'rejection_reason',
        'info_request', 'report', 'recommendations', 'overall_score', 'created_by'
    ];

    protected $casts = [
        'is_internal' => 'boolean',
        'desired_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
    ];

    public function trainingType()
    {
        return $this->belongsTo(TrainingType::class);
    }

    public function provider()
    {
        return $this->belongsTo(TrainingProvider::class);
    }

    public function costCenter()
    {
        return $this->belongsTo(TrainingCostCenter::class, 'cost_center_id');
    }

    public function documents()
    {
        return $this->hasMany(TrainingDocument::class);
    }

    public function participants()
    {
        return $this->hasMany(TrainingParticipant::class);
    }

    public function attendances()
    {
        return $this->hasMany(TrainingAttendance::class);
    }

    public function evaluations()
    {
        return $this->hasMany(TrainingEvaluation::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function employees()
    {
        return $this->belongsToMany(Employee::class, 'training_participants', 'training_id', 'employee_id');
    }
}
