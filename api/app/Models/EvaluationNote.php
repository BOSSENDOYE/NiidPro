<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationNote extends Model
{
    protected $table = 'evaluation_notes';

    protected $fillable = [
        'evaluation_id', 'critere_id', 'note', 'note_ponderee',
        'commentaire_agent', 'commentaire_hierarchique',
    ];

    protected $casts = [
        'note'          => 'integer',
        'note_ponderee' => 'float',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::saving(function (EvaluationNote $en) {
            if (!is_null($en->note)) {
                $critere = $en->critere ?? EvaluationCritere::find($en->critere_id);
                if ($critere) {
                    $en->note_ponderee = round((float) $en->note * $critere->poids, 4);
                }
            }
        });
    }

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(EvaluationPeriodeEssai::class, 'evaluation_id');
    }

    public function critere(): BelongsTo
    {
        return $this->belongsTo(EvaluationCritere::class, 'critere_id');
    }
}
