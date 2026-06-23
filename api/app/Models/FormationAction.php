<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationAction extends Model
{
    protected $table = 'formation_actions';

    protected $fillable = [
        'intitule', 'objectifs_pedagogiques', 'categorie', 'duree_jours',
        'mode', 'caractere', 'cout_unitaire_estime', 'prestataire_id', 'statut',
    ];

    protected function casts(): array
    {
        return [
            'duree_jours'          => 'decimal:1',
            'cout_unitaire_estime' => 'decimal:2',
        ];
    }

    public function prestataire()
    {
        return $this->belongsTo(FormationPrestataire::class, 'prestataire_id');
    }

    public function besoins()
    {
        return $this->hasMany(FormationBesoin::class, 'action_id');
    }

    public function lignes()
    {
        return $this->hasMany(LignePlanFormation::class, 'action_id');
    }
}
