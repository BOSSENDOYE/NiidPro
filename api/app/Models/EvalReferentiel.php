<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvalReferentiel extends Model
{
    use HasFactory;

    protected $table = 'eval_referentiels';

    protected $fillable = [
        'code', 'version', 'libelle',
        'note_min', 'note_max',
        'verrouille', 'verrouille_at', 'verrouille_par',
        'cree_par',
    ];

    protected $casts = [
        'verrouille'    => 'boolean',
        'verrouille_at' => 'datetime',
        'note_min'      => 'integer',
        'note_max'      => 'integer',
        'version'       => 'integer',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function criteres(): HasMany
    {
        return $this->hasMany(EvalCritere::class, 'referentiel_id')->orderBy('ordre');
    }

    public function criteresSocles(): HasMany
    {
        return $this->criteres()->where('type', 'socle');
    }

    public function criteresComplementaires(): HasMany
    {
        return $this->criteres()->where('type', 'complementaire');
    }

    public function campagnes(): HasMany
    {
        return $this->hasMany(EvalCampagne::class, 'referentiel_id');
    }

    public function createur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cree_par');
    }

    public function verrouilleur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verrouille_par');
    }

    // ── Méthodes métier ───────────────────────────────────────────────────

    /**
     * Verrouille le référentiel (appelé au lancement de campagne — §4.1).
     * Un référentiel verrouillé ne peut plus être modifié.
     */
    public function verrouiller(User $par): void
    {
        if ($this->verrouille) {
            return;
        }

        $this->update([
            'verrouille'    => true,
            'verrouille_at' => now(),
            'verrouille_par' => $par->id,
        ]);
    }

    /**
     * Crée une nouvelle version du référentiel (copie des critères + version + 1).
     * Utiliser quand on veut modifier un référentiel déjà verrouillé.
     */
    public function nouvellVersion(User $par): self
    {
        $nouvel = self::create([
            'code'    => $this->code,
            'version' => self::where('code', $this->code)->max('version') + 1,
            'libelle' => $this->libelle,
            'note_min' => $this->note_min,
            'note_max' => $this->note_max,
            'cree_par' => $par->id,
        ]);

        foreach ($this->criteres as $critere) {
            $nouvel->criteres()->create([
                'code'    => $critere->code,
                'libelle' => $critere->libelle,
                'type'    => $critere->type,
                'ordre'   => $critere->ordre,
                'actif'   => $critere->actif,
            ]);
        }

        return $nouvel;
    }

    /**
     * Retourne les critères applicables pour une catégorie d'agent.
     * 'mis_a_disposition' → socle + complémentaire
     * autres             → socle uniquement
     */
    public function criteresParCategorie(string $categorieAgent): \Illuminate\Database\Eloquent\Collection
    {
        $types = $categorieAgent === 'mis_a_disposition'
            ? ['socle', 'complementaire']
            : ['socle'];

        return $this->criteres()
            ->whereIn('type', $types)
            ->where('actif', true)
            ->get();
    }

    // ── Scope ─────────────────────────────────────────────────────────────

    public function scopeDerniereVersion($query, string $code)
    {
        return $query->where('code', $code)->orderByDesc('version')->first();
    }
}
