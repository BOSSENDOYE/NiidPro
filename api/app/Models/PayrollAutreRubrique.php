<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollAutreRubrique extends Model
{
    protected $table = 'payroll_autres_rubriques';

    protected $fillable = [
        'code', 'libelle', 'type', 'sens', 'unite', 'valeur', 'description', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'valeur'    => 'decimal:2',
    ];
}
