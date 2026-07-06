<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    protected $fillable = [
        'name', 'code', 'category', 'color', 'requires_justification', 'paid', 'max_days_per_year', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'requires_justification' => 'boolean',
            'paid'      => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }
}
