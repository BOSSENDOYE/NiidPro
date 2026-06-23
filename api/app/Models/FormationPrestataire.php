<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationPrestataire extends Model
{
    protected $table = 'formation_prestataires';

    protected $fillable = [
        'nom', 'type', 'contact_nom', 'email', 'telephone', 'adresse', 'statut',
    ];

    public function actions()
    {
        return $this->hasMany(FormationAction::class, 'prestataire_id');
    }

    public function sessions()
    {
        return $this->hasMany(FormationSession::class, 'prestataire_id');
    }
}
