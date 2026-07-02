<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollCotisation extends Model
{
    protected $table = 'payroll_cotisations';

    protected $fillable = [
        'code', 'libelle', 'type', 'taux_salarial', 'taux_patronal',
        'plafond', 'assiette', 'description', 'is_active',
    ];

    protected $casts = [
        'is_active'      => 'boolean',
        'taux_salarial'  => 'decimal:4',
        'taux_patronal'  => 'decimal:4',
        'plafond'        => 'decimal:2',
    ];
}
