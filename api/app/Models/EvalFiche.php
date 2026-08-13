<?php

namespace App\Models;

use App\Enums\EvalStatutFiche;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EvalFiche extends Model
{
    use HasFactory;

    protected $table = 'eval_fiches';

    protected $fillable = [
        'campagne_id', 'employee_id', 'evaluateur_id', 'statut', 'categorie_agent',
        'snapshot_matricule', 'snapshot_nom_complet', 'snapshot_direction',
        'snapshot_service', 'snapshot_fonction', 'snapshot_superieur', 'snapshot_anciennete_mois',
        'date_entretien', 'heure_entretien', 'lieu_entretien', 'type_entretien',
        'motif_report', 'nouvelle_date_entretien', 'nb_replanifications',
        'entretien_tenu', 'entretien_tenu_at',
        'convocation_envoyee_at', 'convocation_accusee_at',
        'moyenne', 'appreciation',
        'realisations', 'difficultes', 'competences_demontrees',
        'bilan_plan_action', 'perspectives_evolution',
        'observations_evaluateur', 'observations_agent',
        'refus_signature_agent', 'motif_refus_signature',
        'signe_evaluateur_at', 'signe_agent_at', 'transmise_daf_at',
        'receptionee_daf_at', 'notifiee_at', 'archivee_at',
        'avis_chef_service', 'chef_service_id',
        'observations_dg', 'dg_user_id', 'daf_user_id',
        'ref_notation_fp',
        'courrier_etabli_at',
    ];

    protected $casts = [
        'statut'                  => EvalStatutFiche::class,
        'date_entretien'          => 'date',
        'nouvelle_date_entretien' => 'date',
        'entretien_tenu'          => 'boolean',
        'refus_signature_agent'   => 'boolean',
        'entretien_tenu_at'       => 'datetime',
        'convocation_envoyee_at'  => 'datetime',
        'convocation_accusee_at'  => 'datetime',
        'signe_evaluateur_at'     => 'datetime',
        'signe_agent_at'          => 'datetime',
        'transmise_daf_at'        => 'datetime',
        'receptionee_daf_at'      => 'datetime',
        'notifiee_at'             => 'datetime',
        'archivee_at'             => 'datetime',
        'courrier_etabli_at'      => 'datetime',
        'moyenne'                 => 'float',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

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

    public function historiqueStatuts(): HasMany
    {
        return $this->hasMany(EvalHistoriqueStatut::class, 'fiche_id')->orderBy('created_at');
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

    public function courrier(): HasOne
    {
        return $this->hasOne(\App\Models\EvalCourrier::class, 'fiche_id');
    }

    // ── Machine à états — transitions (§6) ────────────────────────────────

    /**
     * Fait transitionner la fiche vers $nouveauStatut si la transition est autorisée.
     * Enregistre le mouvement dans l'historique et dans l'audit.
     *
     * @throws \DomainException si la transition n'est pas autorisée
     */
    public function transitionnerVers(
        EvalStatutFiche $nouveauStatut,
        ?User           $auteur = null,
        ?string         $motif  = null,
        array           $meta   = [],
    ): void {
        $statutActuel = $this->statut;

        if (! $statutActuel->peutTransitionnerVers($nouveauStatut)) {
            throw new \DomainException(
                "Transition interdite : {$statutActuel->libelle()} → {$nouveauStatut->libelle()}"
            );
        }

        // Horodatages automatiques par statut cible
        $extra = $this->horodatagesAutomatiques($nouveauStatut);

        $this->update(array_merge(['statut' => $nouveauStatut->value], $extra));

        // Journal des transitions
        EvalHistoriqueStatut::create([
            'fiche_id'   => $this->id,
            'statut_de'  => $statutActuel->value,
            'statut_vers' => $nouveauStatut->value,
            'motive_par' => $auteur?->id,
            'motif'      => $motif,
            'meta'       => $meta ?: null,
        ]);

        // Piste d'audit générique
        $this->audit($auteur?->id, "fiche.transition.{$nouveauStatut->value}", [
            'de'   => $statutActuel->value,
            'vers' => $nouveauStatut->value,
            'motif' => $motif,
        ]);
    }

    /**
     * Retourne les champs timestamps à mettre à jour automatiquement
     * lors du passage à un statut donné.
     */
    private function horodatagesAutomatiques(EvalStatutFiche $statut): array
    {
        return match ($statut) {
            EvalStatutFiche::AttenteSignatureAgent => ['signe_evaluateur_at' => now()],
            EvalStatutFiche::Signee                => ['signe_agent_at' => now()],
            EvalStatutFiche::TransmiseDaf          => ['transmise_daf_at' => now()],
            EvalStatutFiche::ReceptioneeDaf      => ['receptionee_daf_at' => now()],
            EvalStatutFiche::Notifiee            => ['notifiee_at' => now()],
            EvalStatutFiche::Archivee            => ['archivee_at' => now()],
            default                              => [],
        };
    }

    // ── Calculs ───────────────────────────────────────────────────────────

    /** Recalcule la moyenne et l'appréciation depuis les notations saisies. */
    public function recalculerMoyenne(): void
    {
        $notes = $this->notations()->whereNotNull('note')->pluck('note');

        if ($notes->isEmpty()) {
            return;
        }

        $avg = round($notes->avg(), 2);

        $referentiel = $this->campagne?->referentiel;
        $max = $referentiel?->note_max ?? 5;

        // Appréciation proportionnelle à l'échelle (défaut 1–5)
        $ratio = $avg / $max;

        $appreciation = match (true) {
            $ratio >= 0.90 => 'excellent',
            $ratio >= 0.70 => 'tres_satisfaisant',
            $ratio >= 0.50 => 'satisfaisant',
            $ratio >= 0.30 => 'a_ameliorer',
            default        => 'insuffisant',
        };

        $this->update(['moyenne' => $avg, 'appreciation' => $appreciation]);
    }

    /** Vérifie qu'aucun critère obligatoire n'est resté non noté. */
    public function tousLesCriteresNotas(): bool
    {
        $attendus  = $this->campagne?->referentiel
            ?->criteresParCategorie($this->categorie_agent)
            ->where('actif', true)
            ->count() ?? 0;

        $saisis = $this->notations()->whereNotNull('note')->count();

        return $saisis >= $attendus;
    }

    // ── Audit ─────────────────────────────────────────────────────────────

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
