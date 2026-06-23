<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanFormation extends Model
{
    protected $table = 'plans_formation';

    protected $fillable = [
        'annee', 'titre', 'periode_debut', 'periode_fin',
        'enveloppe_budgetaire', 'statut', 'valide_par_user_id',
        'date_validation', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'annee'               => 'integer',
            'periode_debut'       => 'date',
            'periode_fin'         => 'date',
            'enveloppe_budgetaire'=> 'decimal:2',
            'date_validation'     => 'datetime',
        ];
    }

    public function lignes()
    {
        return $this->hasMany(LignePlanFormation::class, 'plan_formation_id');
    }

    public function validePar()
    {
        return $this->belongsTo(User::class, 'valide_par_user_id');
    }
}
