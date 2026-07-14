<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalObjectif extends Model
{
    protected $table = 'eval_objectifs';

    protected $fillable = ['fiche_id', 'objectif', 'indicateur', 'echeance', 'ordre'];

    protected $casts = ['echeance' => 'date'];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(EvalFiche::class, 'fiche_id');
    }
}
