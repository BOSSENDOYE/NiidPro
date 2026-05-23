<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Justification extends Model
{
    protected $fillable = [
        'employee_id', 'attendance_id', 'absence_date', 'reason', 'document_path',
        'status', 'reviewed_by', 'reviewed_at', 'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'absence_date' => 'date',
            'reviewed_at'  => 'datetime',
        ];
    }

    public function employee()   { return $this->belongsTo(Employee::class); }
    public function attendance() { return $this->belongsTo(Attendance::class); }
    public function reviewer()   { return $this->belongsTo(User::class, 'reviewed_by'); }
}
