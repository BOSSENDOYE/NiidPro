<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanRecrutement extends Model
{
    protected $table = 'plans_recrutement';

    protected $fillable = [
        'annee',
        'titre',
        'periode_debut',
        'periode_fin',
        'enveloppe_budgetaire',
        'statut',
        'valide_par_user_id',
        'date_validation',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'annee'                => 'integer',
            'periode_debut'        => 'date',
            'periode_fin'          => 'date',
            'enveloppe_budgetaire' => 'decimal:2',
            'date_validation'      => 'datetime',
            'statut'               => 'string',
        ];
    }

    // Relations
    public function lignes()
    {
        return $this->hasMany(LignePlan::class, 'plan_recrutement_id');
    }

    public function validePar()
    {
        return $this->belongsTo(User::class, 'valide_par_user_id');
    }
}
