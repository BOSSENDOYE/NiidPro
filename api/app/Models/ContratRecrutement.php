<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContratRecrutement extends Model
{
    protected $table = 'contrats_recrutement';

    protected $fillable = [
        'decision_id',
        'type_contrat',
        'date_debut',
        'date_fin',
        'date_fin_essai',
        'salaire_base',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_debut'    => 'date',
            'date_fin'      => 'date',
            'date_fin_essai'=> 'date',
            'salaire_base'  => 'decimal:2',
            'type_contrat'  => 'string',
        ];
    }

    // Relations
    public function decision()
    {
        return $this->belongsTo(DecisionRecrutement::class, 'decision_id');
    }

    public function rapportsEssai()
    {
        return $this->hasMany(PeriodeEssaiRapport::class, 'contrat_id');
    }
}
