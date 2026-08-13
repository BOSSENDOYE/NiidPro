<?php

namespace App\Models;

use App\Enums\EvalStatutFiche;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalHistoriqueStatut extends Model
{
    protected $table = 'eval_historique_statuts';

    public $timestamps = false;

    protected $fillable = [
        'fiche_id', 'statut_de', 'statut_vers',
        'motive_par', 'motif', 'meta',
    ];

    protected $casts = [
        'meta'       => 'array',
        'created_at' => 'datetime',
    ];

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(EvalFiche::class, 'fiche_id');
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'motive_par');
    }

    public function statutDeEnum(): ?EvalStatutFiche
    {
        return $this->statut_de ? EvalStatutFiche::from($this->statut_de) : null;
    }

    public function statutVersEnum(): EvalStatutFiche
    {
        return EvalStatutFiche::from($this->statut_vers);
    }
}
