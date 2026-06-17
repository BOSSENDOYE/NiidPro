<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EtapeHistorique extends Model
{
    protected $table = 'etapes_historique';

    protected $fillable = [
        'processus_id',
        'etape',
        'date_entree',
        'date_sortie',
        'valide_par_user_id',
        'role_validateur',
        'commentaire',
    ];

    protected function casts(): array
    {
        return [
            'date_entree'  => 'datetime',
            'date_sortie'  => 'datetime',
            'etape'        => 'string',
        ];
    }

    // Relations
    public function processus()
    {
        return $this->belongsTo(ProcessusRecrutement::class, 'processus_id');
    }

    public function validePar()
    {
        return $this->belongsTo(User::class, 'valide_par_user_id');
    }
}
