<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvalSynthese extends Model
{
    protected $table = 'eval_syntheses';

    protected $fillable = [
        'campagne_id', 'version', 'statut', 'donnees',
        'completude_confirmee', 'completude_confirmee_par', 'completude_confirmee_at',
        'notes_division_rh', 'notes_par', 'notes_at',
        'transmis_dg_par', 'transmis_dg_at',
        'genere_par',
        // SP5
        'annotation_dg', 'etudie_dg_par', 'etudie_dg_at', 'valide_dg_par', 'valide_dg_at',
    ];

    protected $casts = [
        'donnees'                 => 'array',
        'completude_confirmee'    => 'boolean',
        'completude_confirmee_at' => 'datetime',
        'notes_at'                => 'datetime',
        'transmis_dg_at'          => 'datetime',
        'etudie_dg_at'            => 'datetime',
        'valide_dg_at'            => 'datetime',
    ];

    // ── Relations ─────────────────────────────────────────────────────────

    public function campagne(): BelongsTo
    {
        return $this->belongsTo(EvalCampagne::class);
    }

    public function generateurUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'genere_par');
    }

    public function transmetteurDg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transmis_dg_par');
    }

    public function etudiantDg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'etudie_dg_par');
    }

    public function valideurDg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_dg_par');
    }

    public function gratifications(): HasMany
    {
        return $this->hasMany(EvalGratification::class, 'synthese_id');
    }

    // ── État ──────────────────────────────────────────────────────────────

    public function estTransmis(): bool
    {
        return $this->statut === 'transmis';
    }

    public function estValideDg(): bool
    {
        return $this->statut === 'valide_dg';
    }

    public function estEtudie(): bool
    {
        return $this->etudie_dg_at !== null;
    }
}
