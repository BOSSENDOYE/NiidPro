<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationPeriodeEssai extends Model
{
    protected $table = 'evaluations_periode_essai';

    protected $fillable = [
        'employee_id', 'responsable_id', 'type', 'categorie',
        'date_prise_poste', 'date_fin_periode', 'date_envoi_fiche', 'date_entretien',
        'note_globale', 'appreciation', 'decision_recommandee',
        'commentaire_general', 'plan_amelioration',
        'statut', 'statut_dossier',
        'signe_agent_at', 'signe_hierarchique_at',
        'valide_rrh_at', 'valide_rrh_user_id',
        'decision_dg_at', 'decision_dg_user_id', 'decision_finale', 'remarques_dg',
    ];

    protected $casts = [
        'date_prise_poste'       => 'date',
        'date_fin_periode'       => 'date',
        'date_envoi_fiche'       => 'date',
        'date_entretien'         => 'date',
        'note_globale'           => 'float',
        'signe_agent_at'         => 'datetime',
        'signe_hierarchique_at'  => 'datetime',
        'valide_rrh_at'          => 'datetime',
        'decision_dg_at'         => 'datetime',
    ];

    // ── Calcul automatique note globale ──────────────────────────────────────
    public function recalculerNote(): void
    {
        $notations = $this->notations()->with('critere')->get();
        if ($notations->isEmpty()) {
            return;
        }

        $somme = (float) $notations->sum('note_ponderee');
        $this->note_globale = round($somme, 2);

        $this->appreciation = match (true) {
            $somme < 1.5  => 'insuffisant',
            $somme < 2.5  => 'passable',
            $somme < 3.25 => 'satisfaisant',
            default       => 'excellent',
        };

        $this->decision_recommandee = match (true) {
            $somme < 2.0  => 'non_confirmation',
            $somme < 2.5  => 'renouvellement',
            default       => 'confirmation',
        };

        $this->saveQuietly();
    }

    // ── Relations ────────────────────────────────────────────────────────────
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    public function valideRrhUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_rrh_user_id');
    }

    public function decisionDgUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decision_dg_user_id');
    }

    public function notations(): HasMany
    {
        return $this->hasMany(EvaluationNote::class, 'evaluation_id');
    }

    public function historique(): HasMany
    {
        return $this->hasMany(EvaluationHistorique::class, 'evaluation_id')->orderBy('created_at');
    }
}
