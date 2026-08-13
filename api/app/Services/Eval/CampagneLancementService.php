<?php

namespace App\Services\Eval;

use App\Enums\EvalStatutCampagne;
use App\Enums\EvalStatutFiche;
use App\Models\EvalAudit;
use App\Models\EvalCampagne;
use App\Models\EvalFiche;
use App\Models\EvalHistoriqueStatut;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CampagneLancementService
{
    // ── Anomalies d'organigramme (§4.2, §7.1 contrôle bloquant) ─────────

    /**
     * Retourne la liste des agents actifs sans responsable hiérarchique désigné.
     * Un résultat vide = organigramme complet = feu vert pour lancement.
     */
    public function rapportAnomalies(): array
    {
        $sansManager = Employee::with(['department:id,name', 'position:id,title'])
            ->whereNull('termination_date')
            ->where('status', 'active')
            ->whereNull('manager_id')
            ->get()
            ->map(fn(Employee $e) => [
                'id'           => $e->id,
                'matricule'    => $e->employee_number,
                'nom_complet'  => trim("{$e->first_name} {$e->last_name}"),
                'direction'    => $e->department?->name,
                'fonction'     => $e->fonction ?? $e->position?->title,
            ])
            ->values()
            ->all();

        return [
            'anomalies'      => $sansManager,
            'nb_anomalies'   => count($sansManager),
            'peut_lancer'    => count($sansManager) === 0,
        ];
    }

    // ── Génération de la note de service (§7.1) ───────────────────────────

    /**
     * Génère le texte de la note de service à partir du modèle réglementaire.
     * Le texte est stocké dans campagne.note_service.
     */
    public function genererNoteService(EvalCampagne $campagne): string
    {
        $exercice  = $campagne->exercice;
        $dateRef   = now()->locale('fr')->isoFormat('D MMMM YYYY');
        $periodeDebut = $campagne->periode_debut?->locale('fr')->isoFormat('MMMM YYYY') ?? (($exercice - 1) . ' — ' . ($exercice));

        $texte = <<<TXT
AGENCE NATIONALE DE LA SÉCURITÉ ROUTIÈRE (ANASER)
Direction Générale

NOTE DE SERVICE N° ___/DG/ANASER/{$exercice}

Objet : Lancement de la campagne d'évaluation annuelle du personnel — Exercice {$exercice}

Dakar, le {$dateRef}

Le Directeur Général de l'Agence Nationale de la Sécurité Routière,

Vu le Manuel de procédures ANASER (Version 01 — août 2023), Chapitre IV, Sections B et 11 ;
Vu la Note de cadrage — Campagne d'évaluation annuelle du personnel, Exercice {$exercice} ;

Informe l'ensemble du personnel que la campagne d'évaluation annuelle du personnel pour l'exercice {$exercice} est ouverte à compter de ce jour.

ARTICLE 1 — OBJET
La présente note de service a pour objet d'annoncer le lancement de la campagne d'évaluation annuelle couvrant la période {$periodeDebut}.

ARTICLE 2 — PERSONNEL CONCERNÉ
L'évaluation concerne l'ensemble des agents de l'ANASER, conformément au Manuel de procédures : les agents recrutés directement par l'Agence (contractuels), les fonctionnaires et agents non fonctionnaires mis à la disposition de l'ANASER par l'État, ainsi que les agents décisionnaires.

ARTICLE 3 — PRINCIPES FONDAMENTAUX
Il est rappelé que l'évaluation ne revêt aucun caractère disciplinaire et doit être conduite dans le respect de la dignité de chaque agent (Manuel de procédures, art. 4.B.1).

ARTICLE 4 — CALENDRIER
Le calendrier indicatif de la campagne est le suivant :
{$this->formatCalendrier($campagne)}

ARTICLE 5 — DISPOSITIONS PRATIQUES
Chaque responsable hiérarchique recevra, par l'intermédiaire du système d'information NiidPro, la liste de ses collaborateurs à évaluer ainsi que les fiches d'évaluation correspondantes. Les entretiens doivent être planifiés et conduits dans les délais impartis.

Pour toute question, s'adresser à la Division des Ressources Humaines.

Le Directeur Général
TXT;

        $campagne->update(['note_service' => $texte]);

        return $texte;
    }

    // ── Lancement de la campagne (§7.1 — action principale) ───────────────

    /**
     * Lance la campagne : vérifie tous les contrôles bloquants, génère les fiches,
     * verrouille le référentiel et passe la campagne au statut Lancée.
     *
     * @throws \DomainException si un contrôle bloquant échoue
     */
    public function lancerCampagne(EvalCampagne $campagne, User $lanceur): array
    {
        // ── 1. Vérifications bloquantes ────────────────────────────────
        $this->verifierPretLancement($campagne);

        // ── 2. Transaction atomique ────────────────────────────────────
        return DB::transaction(function () use ($campagne, $lanceur) {
            // ── 3. Verrouiller le référentiel (§4.1) ─────────────────
            $campagne->referentiel->verrouiller($lanceur);

            // ── 4. Snapshot du périmètre d'agents (§7.1) ─────────────
            $employes = $this->chargerEmployesActifs();
            $campagne->update([
                'snapshot_agents' => $employes->map(fn(Employee $e) => [
                    'id'          => $e->id,
                    'matricule'   => $e->employee_number,
                    'nom_complet' => trim("{$e->first_name} {$e->last_name}"),
                ])->all(),
            ]);

            // ── 5. Générer les fiches ──────────────────────────────────
            $nbFiches = $this->genererFiches($campagne, $lanceur, $employes);

            // ── 6. Passer la campagne au statut Lancée ─────────────────
            $campagne->update([
                'statut'    => EvalStatutCampagne::Lancee->value,
                'lance_par' => $lanceur->id,
                'lance_at'  => now(),
            ]);

            // ── 7. Audit ───────────────────────────────────────────────
            EvalAudit::create([
                'user_id'     => $lanceur->id,
                'action'      => 'campagne.lancer',
                'entite_type' => 'EvalCampagne',
                'entite_id'   => $campagne->id,
                'meta'        => [
                    'fiches_generees' => $nbFiches,
                    'referentiel'     => $campagne->referentiel->only(['code', 'version', 'libelle']),
                ],
            ]);

            return [
                'fiches_generees'  => $nbFiches,
                'agents_concernes' => $employes->count(),
            ];
        });
    }

    // ── Helpers privés ────────────────────────────────────────────────────

    /** Lève une DomainException si un contrôle bloquant n'est pas satisfait. */
    private function verifierPretLancement(EvalCampagne $campagne): void
    {
        if ($campagne->statut !== EvalStatutCampagne::Brouillon) {
            throw new \DomainException('Cette campagne est déjà lancée ou clôturée.');
        }

        // Référentiel associé (§7.1 contrôle 1)
        $erreurs = $campagne->anomaliesLancement();
        if (! empty($erreurs)) {
            throw new \DomainException('Paramétrage incomplet : ' . implode(' ', $erreurs));
        }

        // Note de service signée (§7.1 — avant diffusion officielle)
        if (! $campagne->note_service_signee) {
            throw new \DomainException(
                'La note de service doit être signée par le Directeur Général avant le lancement.'
            );
        }

        // Anomalies organigramme (§4.2 contrôle bloquant)
        $rapport = $this->rapportAnomalies();
        if (! $rapport['peut_lancer']) {
            throw new \DomainException(
                "{$rapport['nb_anomalies']} agent(s) actif(s) sans responsable hiérarchique désigné. " .
                'Corrigez l\'organigramme avant de lancer la campagne.'
            );
        }
    }

    /** Charge les agents actifs avec leurs relations nécessaires. */
    private function chargerEmployesActifs()
    {
        return Employee::with([
            'department:id,name',
            'organisationUnit:id,libelle',
            'position:id,title',
            'manager:id,user_id,first_name,last_name',
        ])
            ->whereNull('termination_date')
            ->where('status', 'active')
            ->get();
    }

    /**
     * Génère une fiche par agent et effectue la transition automatique
     * Cree → TransmiseResponsable (§6, statuts 1 et 2).
     */
    private function genererFiches(EvalCampagne $campagne, User $lanceur, $employes): int
    {
        $nbCrees = 0;

        foreach ($employes as $employee) {
            $evaluateurId  = $employee->manager?->user_id;
            $categorieAgent = $this->determinerCategorieAgent($employee);
            $anciennete    = $employee->hire_date
                ? (int) Carbon::parse($employee->hire_date)->diffInMonths(now())
                : null;

            /** @var EvalFiche $fiche */
            [$fiche, $created] = $this->firstOrCreateFiche($campagne, $employee, [
                'evaluateur_id'            => $evaluateurId,
                'categorie_agent'          => $categorieAgent,
                'snapshot_matricule'       => $employee->employee_number,
                'snapshot_nom_complet'     => trim("{$employee->first_name} {$employee->last_name}"),
                'snapshot_direction'       => $employee->department?->name,
                'snapshot_service'         => $employee->organisationUnit?->libelle,
                'snapshot_fonction'        => $employee->fonction ?? $employee->position?->title,
                'snapshot_superieur'       => $this->nomSuperieur($employee),
                'snapshot_anciennete_mois' => $anciennete,
            ]);

            if ($created) {
                // Enregistrement création initiale
                EvalHistoriqueStatut::create([
                    'fiche_id'    => $fiche->id,
                    'statut_de'   => null,
                    'statut_vers' => EvalStatutFiche::Cree->value,
                    'motive_par'  => $lanceur->id,
                    'motif'       => 'Génération automatique — lancement campagne',
                ]);

                // Transition immédiate vers TransmiseResponsable si évaluateur connu
                if ($evaluateurId) {
                    $fiche->transitionnerVers(
                        EvalStatutFiche::TransmiseResponsable,
                        $lanceur,
                        'Diffusion automatique selon organigramme — SP1'
                    );
                }

                $nbCrees++;
            }
        }

        return $nbCrees;
    }

    /**
     * Wrapper firstOrCreate qui retourne [EvalFiche, bool $wasCreated].
     * On ne peut pas utiliser firstOrCreate directement car le modèle
     * a un cast enum sur 'statut' qui nécessite le bon type.
     */
    private function firstOrCreateFiche(EvalCampagne $campagne, Employee $employee, array $defaults): array
    {
        $exists = EvalFiche::where('campagne_id', $campagne->id)
            ->where('employee_id', $employee->id)
            ->first();

        if ($exists) {
            return [$exists, false];
        }

        $fiche = EvalFiche::create(array_merge([
            'campagne_id' => $campagne->id,
            'employee_id' => $employee->id,
            'statut'      => EvalStatutFiche::Cree->value,
        ], $defaults));

        return [$fiche, true];
    }

    /** Détermine la catégorie de l'agent selon son `categorie_emploi`. */
    private function determinerCategorieAgent(Employee $employee): string
    {
        $cat = strtolower($employee->categorie_emploi ?? '');

        if (str_contains($cat, 'fonctionnaire') || str_contains($cat, 'détach') || str_contains($cat, 'disposition')) {
            return 'mis_a_disposition';
        }
        if (str_contains($cat, 'décision') || str_contains($cat, 'decisionnaire')) {
            return 'decisionnaire';
        }

        return 'contractuel';
    }

    /** Retourne le nom complet du supérieur hiérarchique pour le snapshot. */
    private function nomSuperieur(Employee $employee): ?string
    {
        if (! $employee->manager) {
            return null;
        }
        return trim("{$employee->manager->first_name} {$employee->manager->last_name}");
    }

    /** Formate le calendrier indicatif pour la note de service. */
    private function formatCalendrier(EvalCampagne $campagne): string
    {
        $lignes = [];

        if ($campagne->date_lancement) {
            $lignes[] = '  - SP1 Lancement : ' . $campagne->date_lancement->locale('fr')->isoFormat('MMMM YYYY');
        }
        if ($campagne->date_limite_planification) {
            $lignes[] = '  - SP2 Planification des entretiens : avant le ' . $campagne->date_limite_planification->locale('fr')->isoFormat('D MMMM YYYY');
        }
        if ($campagne->date_limite_entretiens) {
            $lignes[] = '  - SP3 Entretiens et notation : avant le ' . $campagne->date_limite_entretiens->locale('fr')->isoFormat('D MMMM YYYY');
        }
        if ($campagne->date_limite_transmission) {
            $lignes[] = '  - SP4 Transmission au DAF : avant le ' . $campagne->date_limite_transmission->locale('fr')->isoFormat('D MMMM YYYY');
        }
        if ($campagne->date_limite_synthese) {
            $lignes[] = '  - SP5 Décision DG : avant le ' . $campagne->date_limite_synthese->locale('fr')->isoFormat('D MMMM YYYY');
        }
        if ($campagne->date_cloture) {
            $lignes[] = '  - SP6 Notification et clôture : avant le ' . $campagne->date_cloture->locale('fr')->isoFormat('D MMMM YYYY');
        }

        return empty($lignes) ? '  (calendrier à définir)' : implode("\n", $lignes);
    }
}
