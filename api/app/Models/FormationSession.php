<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationSession extends Model
{
    protected $table = 'formation_sessions';

    protected $fillable = [
        'ligne_plan_id', 'date_debut', 'date_fin', 'lieu',
        'prestataire_id', 'nb_participants_reel', 'cout_reel', 'statut', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_debut' => 'date',
            'date_fin'   => 'date',
            'cout_reel'  => 'decimal:2',
        ];
    }

    public function lignePlan()
    {
        return $this->belongsTo(LignePlanFormation::class, 'ligne_plan_id');
    }

    public function prestataire()
    {
        return $this->belongsTo(FormationPrestataire::class, 'prestataire_id');
    }

    public function inscriptions()
    {
        return $this->hasMany(FormationInscription::class, 'session_id');
    }
}
