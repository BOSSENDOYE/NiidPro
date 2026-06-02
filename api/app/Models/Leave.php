<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Leave extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id', 'leave_type_id', 'start_date', 'end_date', 'days_count',
        'status', 'reason', 'document_path', 'approved_by', 'approved_at', 'rejection_reason',
        'comment', 'justification_deadline', 'justification_submitted_at',
        'friday_rule_applied', 'original_start_date',
    ];

    protected function casts(): array
    {
        return [
            'start_date'                  => 'date',
            'end_date'                    => 'date',
            'original_start_date'         => 'date',
            'approved_at'                 => 'datetime',
            'justification_deadline'      => 'datetime',
            'justification_submitted_at'  => 'datetime',
            'friday_rule_applied'         => 'boolean',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
