<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationCritere extends Model
{
    protected $table = 'evaluation_criteres';

    protected $fillable = [
        'code', 'libelle', 'groupe', 'poids', 'ordre', 'actif',
    ];

    protected $casts = [
        'poids'  => 'float',
        'actif'  => 'boolean',
        'ordre'  => 'integer',
    ];

    public function notations(): HasMany
    {
        return $this->hasMany(EvaluationNote::class, 'critere_id');
    }
}
