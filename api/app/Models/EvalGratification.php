<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalGratification extends Model
{
    protected $table = 'eval_gratifications';

    protected $fillable = [
        'synthese_id', 'fiche_id', 'employee_id',
        'type_decision', 'commentaire', 'decide_par', 'decided_at',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];

    // Types de décision paramétrables (CDC §7.5)
    public const TYPES_DECISION = [
        'prime'              => 'Prime',
        'lettre_felicitation' => 'Lettre de félicitation',
        'promotion'          => 'Proposition de promotion',
        'aucune'             => 'Aucune décision particulière',
        'avertissement'      => 'Avertissement écrit',
    ];

    public function synthese(): BelongsTo
    {
        return $this->belongsTo(EvalSynthese::class);
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(EvalFiche::class, 'fiche_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function decidePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decide_par');
    }

    public function libelleDecision(): string
    {
        return self::TYPES_DECISION[$this->type_decision] ?? $this->type_decision;
    }
}
