<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetailPlanningConge extends Model
{
    protected $table = 'detail_planning_conges';

    protected $fillable = [
        'employee_id', 'annee', 'critere', 'date_generation', 'date_limite',
        'nbre_jour_dispo', 'supplement_enfant', 'supplement_anciennete', 'supplement_medaille',
        'nbre_jour_conges', 'nbre_jour_a_imputer', 'nbre_jour_total_disponible',
        'utilisateur_cre', 'statut',
        // Dates de planification
        'date_depart_prevu', 'date_retour_prevu', 'nbre_jours_programme',
        'statut_realisation', 'derniere_notif_at', 'leave_id',
    ];

    protected function casts(): array
    {
        return [
            'date_generation'   => 'date',
            'date_limite'       => 'date',
            'date_depart_prevu' => 'date',
            'date_retour_prevu' => 'date',
            'derniere_notif_at' => 'datetime',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'utilisateur_cre');
    }

    public function leave()
    {
        return $this->belongsTo(Leave::class);
    }
}
