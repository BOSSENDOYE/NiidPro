<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalNotation extends Model
{
    protected $table = 'eval_notations';

    protected $fillable = ['fiche_id', 'critere_id', 'note', 'observation'];

    protected $casts = ['note' => 'integer'];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(EvalFiche::class, 'fiche_id');
    }

    public function critere(): BelongsTo
    {
        return $this->belongsTo(EvalCritere::class, 'critere_id');
    }
}
