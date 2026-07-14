<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvalCritere extends Model
{
    protected $table = 'eval_criteres';

    protected $fillable = ['code', 'libelle', 'categorie', 'ordre', 'actif'];

    protected $casts = ['actif' => 'boolean'];

    public function notations(): HasMany
    {
        return $this->hasMany(EvalNotation::class, 'critere_id');
    }

    /** Retourne les critères applicables selon le statut de l'agent. */
    public static function pourStatutAgent(string $statut): \Illuminate\Database\Eloquent\Collection
    {
        $categories = match ($statut) {
            'fonctionnaire' => ['base', 'complementaire', 'fonctionnaire'],
            default         => ['base', 'complementaire'],
        };

        return static::where('actif', true)
            ->whereIn('categorie', $categories)
            ->orderBy('ordre')
            ->get();
    }
}
