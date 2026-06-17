<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PeriodeEssaiRapport extends Model
{
    protected $table = 'periode_essai_rapports';

    protected $fillable = [
        'contrat_id',
        'date_rapport',
        'tuteur_id',
        'appreciation',
        'recommandation',
        'observations',
    ];

    protected function casts(): array
    {
        return [
            'date_rapport'   => 'date',
            'appreciation'   => 'string',
            'recommandation' => 'string',
        ];
    }

    // Relations
    public function contrat()
    {
        return $this->belongsTo(ContratRecrutement::class, 'contrat_id');
    }

    public function tuteur()
    {
        return $this->belongsTo(User::class, 'tuteur_id');
    }
}
