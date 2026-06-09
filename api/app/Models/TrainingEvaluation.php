<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingEvaluation extends Model
{
    protected $fillable = [
        'training_id', 'employee_id', 'score', 'feedback',
        'evaluator_name', 'evaluation_date', 'recommendations', 'status'
    ];

    protected $casts = [
        'evaluation_date' => 'datetime',
        'score' => 'integer',
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
