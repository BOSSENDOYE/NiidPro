<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title', 'description', 'status', 'priority', 'due_date',
        'assigned_to', 'created_by', 'department_id',
    ];

    protected function casts(): array
    {
        return ['due_date' => 'date'];
    }

    public function assignedEmployee() { return $this->belongsTo(Employee::class, 'assigned_to'); }
    public function creator()          { return $this->belongsTo(User::class, 'created_by'); }
    public function department()       { return $this->belongsTo(Department::class); }
}
