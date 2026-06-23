<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationHistorique extends Model
{
    protected $table = 'evaluation_historique';

    protected $fillable = [
        'evaluation_id', 'user_id', 'etape', 'commentaire',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(EvaluationPeriodeEssai::class, 'evaluation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
