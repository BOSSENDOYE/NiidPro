<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvalCritere extends Model
{
    use HasFactory;

    protected $table = 'eval_criteres';

    protected $fillable = ['referentiel_id', 'code', 'libelle', 'type', 'ordre', 'actif'];

    protected $casts = ['actif' => 'boolean'];

    public function referentiel(): BelongsTo
    {
        return $this->belongsTo(EvalReferentiel::class, 'referentiel_id');
    }

    public function notations(): HasMany
    {
        return $this->hasMany(EvalNotation::class, 'critere_id');
    }

    public function estSocle(): bool
    {
        return $this->type === 'socle';
    }

    public function estComplementaire(): bool
    {
        return $this->type === 'complementaire';
    }
}
