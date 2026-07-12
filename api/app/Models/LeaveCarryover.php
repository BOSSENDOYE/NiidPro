<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveCarryover extends Model
{
    protected $fillable = [
        'employee_id', 'year', 'solde_fin_annee', 'plafond',
        'jours_reportes', 'applique_par', 'applied_at',
    ];

    protected function casts(): array
    {
        return [
            'solde_fin_annee' => 'decimal:1',
            'plafond'         => 'decimal:1',
            'jours_reportes'  => 'decimal:1',
            'applied_at'      => 'datetime',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function appliquePar()
    {
        return $this->belongsTo(User::class, 'applique_par');
    }
}
