<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProcessusRecrutement extends Model
{
    protected $table = 'processus_recrutement';

    protected $fillable = [
        'ligne_plan_id',
        'etape_courante',
        'statut',
        'date_demarrage',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_demarrage' => 'date',
            'etape_courante' => 'string',
            'statut'         => 'string',
        ];
    }

    // Relations
    public function lignePlan()
    {
        return $this->belongsTo(LignePlan::class, 'ligne_plan_id');
    }

    public function etapesHistorique()
    {
        return $this->hasMany(EtapeHistorique::class, 'processus_id');
    }

    public function commissionMembres()
    {
        return $this->hasMany(CommissionMembre::class, 'processus_id');
    }

    public function candidatures()
    {
        return $this->hasMany(CandidaturePlan::class, 'processus_id');
    }

    public function decisions()
    {
        return $this->hasMany(DecisionRecrutement::class, 'processus_id');
    }
}
