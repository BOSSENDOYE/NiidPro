<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EvalFiche extends Model
{
    protected $table = 'eval_fiches';

    protected $fillable = [
        'campagne_id', 'employee_id', 'evaluateur_id', 'statut', 'statut_agent',
        'snapshot_direction', 'snapshot_service', 'snapshot_fonction',
        'snapshot_matricule', 'snapshot_superieur', 'snapshot_anciennete_mois',
        'date_entretien', 'lieu_entretien', 'entretien_tenu', 'entretien_tenu_at',
        'moyenne', 'appreciation',
        'realisations', 'difficultes', 'competences_demontrees',
        'observations_evaluateur', 'observations_agent',
        'refus_signature_agent', 'motif_refus_signature',
        'signe_evaluateur_at', 'signe_agent_at', 'transmise_daf_at', 'notifiee_at', 'archivee_at',
        'avis_chef_service', 'chef_service_id', 'avis_dg', 'dg_user_id', 'daf_user_id',
    ];

    protected $casts = [
        'date_entretien'       => 'date',
        'entretien_tenu'       => 'boolean',
        'entretien_tenu_at'    => 'datetime',
        'signe_evaluateur_at'  => 'datetime',
        'signe_agent_at'       => 'datetime',
        'transmise_daf_at'     => 'datetime',
        'notifiee_at'          => 'datetime',
        'archivee_at'          => 'datetime',
        'refus_signature_agent'=> 'boolean',
        'moyenne'              => 'float',
    ];

    public function campagne(): BelongsTo
    {
        return $this->belongsTo(EvalCampagne::class, 'campagne_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function evaluateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluateur_id');
    }

    public function notations(): HasMany
    {
        return $this->hasMany(EvalNotation::class, 'fiche_id');
    }

    public function besoinsFormation(): HasMany
    {
        return $this->hasMany(EvalBesoinFormation::class, 'fiche_id')->orderBy('ordre');
    }

    public function objectifs(): HasMany
    {
        return $this->hasMany(EvalObjectif::class, 'fiche_id')->orderBy('ordre');
    }

    public function decisionRh(): HasOne
    {
        return $this->hasOne(EvalDecisionRh::class, 'fiche_id');
    }

    public function chefService(): BelongsTo
    {
        return $this->belongsTo(User::class, 'chef_service_id');
    }

    public function dgUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dg_user_id');
    }

    public function dafUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'daf_user_id');
    }

    /**
     * Recalcule moyenne et appréciation à partir des notations saisies.
     * Barème CDC §9.3 : note /5.
     */
    public function recalculerMoyenne(): void
    {
        $notes = $this->notations()->whereNotNull('note')->pluck('note');

        if ($notes->isEmpty()) return;

        $moyenne = round($notes->avg(), 2);

        $appreciation = match (true) {
            $moyenne >= 4.50 => 'excellent',
            $moyenne >= 3.50 => 'tres_satisfaisant',
            $moyenne >= 2.50 => 'satisfaisant',
            $moyenne >= 1.50 => 'a_ameliorer',
            default          => 'insuffisant',
        };

        $this->update(['moyenne' => $moyenne, 'appreciation' => $appreciation]);
    }

    /** Audit helper — enregistre une action dans eval_audit. */
    public function audit(int|null $userId, string $action, array $meta = []): void
    {
        EvalAudit::create([
            'user_id'     => $userId,
            'action'      => $action,
            'entite_type' => 'EvalFiche',
            'entite_id'   => $this->id,
            'meta'        => $meta ?: null,
        ]);
    }
}
