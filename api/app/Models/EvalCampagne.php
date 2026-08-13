<?php

namespace App\Models;

use App\Enums\EvalStatutCampagne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvalCampagne extends Model
{
    use HasFactory;

    protected $table = 'eval_campagnes';

    protected $fillable = [
        'exercice', 'titre', 'statut', 'referentiel_id',
        'date_lancement', 'date_limite_planification', 'date_limite_entretiens',
        'date_limite_transmission', 'date_limite_synthese', 'date_cloture',
        'periode_debut', 'periode_fin',
        'note_service', 'note_service_signee', 'note_service_signee_at',
        'snapshot_agents',
        'cree_par', 'lance_par', 'lance_at',
    ];

    protected $casts = [
        'statut'                    => EvalStatutCampagne::class,
        'date_lancement'            => 'date',
        'date_limite_planification' => 'date',
        'date_limite_entretiens'    => 'date',
        'date_limite_transmission'  => 'date',
        'date_limite_synthese'      => 'date',
        'date_cloture'              => 'date',
        'periode_debut'             => 'date',
        'periode_fin'               => 'date',
        'note_service_signee'       => 'boolean',
        'note_service_signee_at'    => 'datetime',
        'lance_at'                  => 'datetime',
        'snapshot_agents'           => 'array',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function referentiel(): BelongsTo
    {
        return $this->belongsTo(EvalReferentiel::class, 'referentiel_id');
    }

    public function fiches(): HasMany
    {
        return $this->hasMany(EvalFiche::class, 'campagne_id');
    }

    public function createur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cree_par');
    }

    public function lanceur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lance_par');
    }

    // ── Méthodes métier ───────────────────────────────────────────────────

    /**
     * Vérifie si la campagne est prête à être lancée (§7.1 contrôle bloquant).
     * Retourne un tableau de messages d'erreur (vide = OK).
     */
    public function anomaliesLancement(): array
    {
        $erreurs = [];

        if (! $this->referentiel_id) {
            $erreurs[] = 'Aucun référentiel de critères associé.';
        }

        if ($this->referentiel && $this->referentiel->criteres()->where('actif', true)->count() === 0) {
            $erreurs[] = 'Le référentiel ne contient aucun critère actif.';
        }

        if (! $this->date_cloture) {
            $erreurs[] = 'Date de clôture obligatoire (contrainte fin d\'exercice).';
        }

        return $erreurs;
    }

    /**
     * Statistiques d'avancement en temps réel (tableau de bord §10.2).
     */
    public function stats(): array
    {
        $q = fn() => $this->fiches();

        return [
            'total'            => $q()->count(),
            'crees'            => $q()->where('statut', 'cree')->count(),
            'a_planifier'      => $q()->whereIn('statut', ['cree', 'transmise_responsable'])->count(),
            'planifiees'       => $q()->where('statut', 'entretien_planifie')->count(),
            'en_cours'         => $q()->whereIn('statut', ['agent_convoque', 'en_cours_notation'])->count(),
            'notees'           => $q()->whereIn('statut', ['notee_attente_discussion', 'attente_signature_agent'])->count(),
            'signees'          => $q()->where('statut', 'signee')->count(),
            'transmises_daf'   => $q()->where('statut', 'transmise_daf')->count(),
            'receptionees_daf' => $q()->where('statut', 'receptionee_daf')->count(),
            'notifiees'        => $q()->where('statut', 'notifiee')->count(),
            'archivees'        => $q()->where('statut', 'archivee')->count(),
            'exceptions'       => $q()->whereIn('statut', ['signature_refusee', 'entretien_reporte', 'cloturee_sortie'])->count(),
            'taux_completion'  => $this->tauxCompletion(),
        ];
    }

    /** Pourcentage de fiches ayant atteint le statut « signée » ou au-delà. */
    public function tauxCompletion(): float
    {
        $total = $this->fiches()->count();
        if ($total === 0) return 0.0;

        $avances = $this->fiches()->whereIn('statut', [
            'signee', 'transmise_daf', 'receptionee_daf', 'integree_synthese',
            'tableau_transmis_dg', 'etudiee_dg', 'annotee_dg', 'validee_notification',
            'courrier_etabli', 'notifiee', 'archivee',
        ])->count();

        return round(($avances / $total) * 100, 1);
    }
}
