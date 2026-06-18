<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = [
        'employee_id', 'date', 'check_in', 'check_out', 'worked_minutes',
        'overtime_minutes', 'status', 'source', 'notes', 'recorded_by',
        'latitude', 'longitude', 'distance_metres',
    ];

    protected function casts(): array
    {
        return [
            'date'      => 'date',
            'check_in'  => 'datetime',
            'check_out' => 'datetime',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function getWorkedHoursAttribute(): float
    {
        return round(($this->worked_minutes ?? 0) / 60, 2);
    }
}
