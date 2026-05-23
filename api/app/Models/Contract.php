<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id', 'type', 'start_date', 'end_date', 'trial_period_end',
        'salary', 'working_hours_per_week', 'document_path', 'notes', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'start_date'       => 'date',
            'end_date'         => 'date',
            'trial_period_end' => 'date',
            'salary'           => 'decimal:2',
            'is_active'        => 'boolean',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        if (!$this->end_date) return false;
        return $this->end_date->diffInDays(now()) <= $days && $this->end_date->isFuture();
    }
}
