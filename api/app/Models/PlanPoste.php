<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanPoste extends Model
{
    protected $table = 'plan_postes';

    protected $fillable = [
        'titre',
        'direction_id',
        'classification_ccni',
        'type_contrat_defaut',
        'statut',
    ];

    protected function casts(): array
    {
        return [
            'statut'              => 'string',
            'classification_ccni' => 'string',
            'type_contrat_defaut' => 'string',
        ];
    }

    // Relations
    public function direction()
    {
        return $this->belongsTo(Department::class, 'direction_id');
    }

    public function besoins()
    {
        return $this->hasMany(BesoinRecrutement::class, 'poste_id');
    }

    public function fichesPoste()
    {
        return $this->hasMany(FichePoste::class, 'poste_id');
    }
}
