<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvalCourrier extends Model
{
    protected $table = 'eval_courriers';

    protected $fillable = [
        'synthese_id', 'fiche_id', 'employee_id', 'modele_id', 'corps_genere',
        'signe_par', 'signe_at',
        'mode_envoi', 'envoye_par', 'envoye_at',
        'accuse_at', 'accuse_par',
    ];

    protected $casts = [
        'signe_at'  => 'datetime',
        'envoye_at' => 'datetime',
        'accuse_at' => 'datetime',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function synthese(): BelongsTo
    {
        return $this->belongsTo(EvalSynthese::class, 'synthese_id');
    }

    public function fiche(): BelongsTo
    {
        return $this->belongsTo(EvalFiche::class, 'fiche_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function modele(): BelongsTo
    {
        return $this->belongsTo(EvalModeleNotification::class, 'modele_id');
    }

    public function signataire(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signe_par');
    }

    public function envoyeur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'envoye_par');
    }

    public function accusePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accuse_par');
    }

    // ── Prédicats ─────────────────────────────────────────────────────────

    public function estSigne(): bool
    {
        return $this->signe_at !== null;
    }

    public function estEnvoye(): bool
    {
        return $this->envoye_at !== null;
    }

    public function estAccuse(): bool
    {
        return $this->accuse_at !== null;
    }

    /** Libellé du mode d'envoi. */
    public function libelleMode(): string
    {
        return match ($this->mode_envoi) {
            'portail'     => 'Portail NiidPro',
            'email'       => 'Messagerie électronique',
            'main_propre' => 'Remise en main propre',
            default       => $this->mode_envoi ?? '—',
        };
    }
}
