<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollTemplateLine extends Model
{
    protected $table = 'payroll_template_lines';

    protected $fillable = [
        'template_id', 'type', 'rubrique_id', 'rubrique_type',
        'code', 'libelle',
        'nombre', 'base_calcul',
        'gain', 'taux_salarial', 'retenu_salarial',
        'taux_patronal', 'retenu_patronal',
        'ordre',
    ];

    protected $casts = [
        'nombre'          => 'decimal:4',
        'base_calcul'     => 'decimal:2',
        'gain'            => 'decimal:2',
        'taux_salarial'   => 'decimal:4',
        'retenu_salarial' => 'decimal:2',
        'taux_patronal'   => 'decimal:4',
        'retenu_patronal' => 'decimal:2',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(PayrollTemplate::class, 'template_id');
    }
}
