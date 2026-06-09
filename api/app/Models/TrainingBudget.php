<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingBudget extends Model
{
    protected $fillable = [
        'name', 'department_id', 'year', 'amount', 'consumed_amount'
    ];

    protected $casts = [
        'year' => 'integer',
        'amount' => 'decimal:2',
        'consumed_amount' => 'decimal:2',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function getRemainingAmountAttribute()
    {
        return (float)$this->amount - (float)$this->consumed_amount;
    }
}
