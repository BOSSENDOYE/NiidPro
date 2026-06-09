<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingCostCenter extends Model
{
    protected $fillable = [
        'name', 'code', 'department_id', 'description', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function trainings()
    {
        return $this->hasMany(Training::class, 'cost_center_id');
    }
}
