<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingParticipant extends Model
{
    protected $fillable = [
        'training_id', 'employee_id', 'status', 'confirmed_at', 'notes'
    ];

    protected $casts = [
        'confirmed_at' => 'datetime',
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
