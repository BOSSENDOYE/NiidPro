<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PdiAction extends Model
{
    protected $table = 'pdi_actions';

    protected $fillable = [
        'pdi_id', 'type', 'intitule', 'organisme',
        'duree_jours', 'echeance', 'indicateur_suivi', 'statut',
    ];

    protected $casts = [
        'echeance' => 'date',
    ];

    public function pdi(): BelongsTo
    {
        return $this->belongsTo(PlanDeveloppementIndividuel::class, 'pdi_id');
    }
}
