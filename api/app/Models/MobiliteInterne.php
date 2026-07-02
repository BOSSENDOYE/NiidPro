<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MobiliteInterne extends Model
{
    protected $table = 'mobilites_internes';

    protected $fillable = [
        'employee_id', 'type_mobilite', 'initiateur',
        'department_avant_id', 'position_avant_id',
        'department_apres_id', 'position_apres_id',
        'motif', 'date_demande', 'date_preavis_30j', 'date_prise_effet',
        'valide_par_sg_id', 'valide_par_daf_id', 'decide_par_dg_id',
        'date_decision', 'delegues_informes', 'commentaire_rh', 'statut',
    ];

    protected $casts = [
        'date_demande'     => 'date',
        'date_preavis_30j' => 'date',
        'date_prise_effet' => 'date',
        'date_decision'    => 'date',
        'delegues_informes' => 'boolean',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function departmentAvant(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_avant_id');
    }

    public function departmentApres(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_apres_id');
    }

    public function positionAvant(): BelongsTo
    {
        return $this->belongsTo(Position::class, 'position_avant_id');
    }

    public function positionApres(): BelongsTo
    {
        return $this->belongsTo(Position::class, 'position_apres_id');
    }

    public function decideDg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decide_par_dg_id');
    }
}
