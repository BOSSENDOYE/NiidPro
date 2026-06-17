<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DecisionRecrutement extends Model
{
    protected $table = 'decisions_recrutement';

    protected $fillable = [
        'processus_id',
        'candidature_id',
        'type',
        'commentaire',
        'valide_par_dg_user_id',
        'date_decision',
    ];

    protected function casts(): array
    {
        return [
            'date_decision' => 'date',
            'type'          => 'string',
        ];
    }

    // Relations
    public function processus()
    {
        return $this->belongsTo(ProcessusRecrutement::class, 'processus_id');
    }

    public function candidature()
    {
        return $this->belongsTo(CandidaturePlan::class, 'candidature_id');
    }

    public function validePar()
    {
        return $this->belongsTo(User::class, 'valide_par_dg_user_id');
    }

    public function contrat()
    {
        return $this->hasOne(ContratRecrutement::class, 'decision_id');
    }
}
