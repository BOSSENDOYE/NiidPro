<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalBesoinFormation extends Model
{
    protected $table = 'eval_besoins_formation';

    protected $fillable = ['fiche_id', 'intitule', 'priorite', 'ordre'];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(EvalFiche::class, 'fiche_id');
    }
}
