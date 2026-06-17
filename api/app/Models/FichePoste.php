<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FichePoste extends Model
{
    protected $table = 'fiches_poste';

    protected $fillable = [
        'poste_id',
        'version',
        'contenu_json',
        'classification_ccni',
        'statut',
        'valide_par_user_id',
        'date_validation',
    ];

    protected function casts(): array
    {
        return [
            'version'             => 'integer',
            'contenu_json'        => 'array',
            'date_validation'     => 'datetime',
            'statut'              => 'string',
            'classification_ccni' => 'string',
        ];
    }

    // Relations
    public function poste()
    {
        return $this->belongsTo(PlanPoste::class, 'poste_id');
    }

    public function validePar()
    {
        return $this->belongsTo(User::class, 'valide_par_user_id');
    }
}
