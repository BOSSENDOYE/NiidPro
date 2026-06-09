<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingAttendance extends Model
{
    protected $fillable = [
        'training_id', 'employee_id', 'attendance_date', 'present', 'absence_reason'
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'present' => 'boolean',
    ];

    public function training()
    {
        return $this->belongsTo(Training::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
    
}
