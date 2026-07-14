<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalDecisionRh extends Model
{
    protected $table = 'eval_decisions_rh';

    protected $fillable = [
        'fiche_id', 'formation', 'coaching', 'mobilite', 'felicitations',
        'suivi_particulier', 'autre', 'commentaire', 'gratification',
        'montant_gratification', 'decideur_id', 'decide_at',
    ];

    protected $casts = [
        'formation'       => 'boolean',
        'coaching'        => 'boolean',
        'mobilite'        => 'boolean',
        'felicitations'   => 'boolean',
        'suivi_particulier' => 'boolean',
        'gratification'   => 'boolean',
        'decide_at'       => 'datetime',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(EvalFiche::class, 'fiche_id');
    }

    public function decideur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decideur_id');
    }
}
