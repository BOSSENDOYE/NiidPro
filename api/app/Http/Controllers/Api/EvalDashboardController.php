<?php

namespace App\Http\Controllers\Api;

use App\Enums\EvalStatutFiche;
use App\Http\Controllers\Controller;
use App\Models\EvalCampagne;
use App\Models\EvalCourrier;
use App\Models\EvalFiche;
use App\Models\EvalGratification;
use App\Models\EvalSynthese;
use App\Models\Employee;
use App\Models\User;
use App\Services\Eval\EvalFicheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tableaux de bord Évaluation par rôle (§10.2).
 * Aussi : historique multi-campagnes d'un agent (§8.5).
 */
class EvalDashboardController extends Controller
{
    public function __construct(private EvalFicheService $ficheService) {}

    // ── §10.2 — Tableau de bord par rôle ─────────────────────────────────

    /**
     * GET /api/eval/dashboard
     * Retourne le tableau de bord adapté au rôle de l'utilisateur connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasAnyRole(['super_admin', 'admin_rh', 'daf'])) {
            return response()->json(array_merge(
                ['role_dashboard' => 'daf'],
                $this->dashboardDaf($user, $request)
            ));
        }

        if ($user->hasAnyRole(['directeur_general', 'secretaire_general'])) {
            return response()->json(array_merge(
                ['role_dashboard' => 'direction'],
                $this->dashboardDirection($user)
            ));
        }

        // Responsable hiérarchique (évaluateur)
        if (EvalFiche::where('evaluateur_id', $user->id)->exists()) {
            return response()->json(array_merge(
                ['role_dashboard' => 'responsable'],
                $this->ficheService->tableauBordResponsable(
                    $user,
                    $request->integer('campagne_id') ?: null
                )
            ));
        }

        // Agent (employé avec dossier)
        return response()->json(array_merge(
            ['role_dashboard' => 'agent'],
            $this->dashboardAgent($user)
        ));
    }

    // ── Dashboards par rôle ───────────────────────────────────────────────

    private function dashboardDaf(User $user, Request $request): array
    {
        // Campagnes actives (non clôturées)
        $campagnesActives = EvalCampagne::whereNotIn('statut', ['brouillon', 'cloturee'])
            ->orderByDesc('exercice')
            ->get();

        $campagne = $campagnesActives->first();

        if (! $campagne) {
            return [
                'campagnes_actives'  => [],
                'nb_campagnes'       => 0,
                'message'            => 'Aucune campagne active.',
            ];
        }

        $fiches = EvalFiche::where('campagne_id', $campagne->id)->get();

        // Comptes par statut
        $parStatut = [];
        foreach (EvalStatutFiche::cases() as $statut) {
            $nb = $fiches->where('statut', $statut)->count();
            if ($nb > 0) {
                $parStatut[$statut->value] = [
                    'libelle'       => $statut->libelle(),
                    'sous_procedure' => $statut->sousProcedure(),
                    'nb'            => $nb,
                ];
            }
        }

        // Taux de complétion (fiches >= ReceptioneeDaf / total lancées)
        $ordreVie    = EvalStatutFiche::ordreCycleVie();
        $idxRecep    = array_search(EvalStatutFiche::ReceptioneeDaf, $ordreVie);
        $total       = $fiches->count();
        $avancees    = $fiches->filter(function (EvalFiche $f) use ($ordreVie, $idxRecep) {
            $idx = array_search($f->statut, $ordreVie);
            return $idx !== false && $idx >= $idxRecep;
        })->count();

        // Fiches en retard (entretien planifié/convoqué mais date dépassée)
        $enRetard = EvalFiche::where('campagne_id', $campagne->id)
            ->whereIn('statut', [
                EvalStatutFiche::EntretienPlanifie->value,
                EvalStatutFiche::AgentConvoque->value,
            ])
            ->where('date_entretien', '<', now()->toDateString())
            ->count();

        // Fiches bloquées (exception)
        $bloquees = $fiches->whereIn('statut', [
            EvalStatutFiche::SignatureRefusee,
            EvalStatutFiche::EntretienReporte,
        ])->count();

        // Dernières synthèses
        $syntheses = EvalSynthese::with('campagne:id,exercice,titre')
            ->orderByDesc('created_at')
            ->take(5)
            ->get();

        return [
            'campagnes_actives'  => $campagnesActives->take(3)->values(),
            'campagne_courante'  => $campagne,
            'nb_fiches_total'    => $total,
            'par_statut'         => array_values($parStatut),
            'taux_completion'    => $total > 0 ? round($avancees / $total * 100, 1) : 0,
            'en_retard'          => $enRetard,
            'bloquees'           => $bloquees,
            'syntheses_recentes' => $syntheses,
        ];
    }

    private function dashboardDirection(User $user): array
    {
        // Synthèses transmises (en attente d'étude DG)
        $synthesesPendantes = EvalSynthese::where('statut', 'transmis')
            ->with('campagne:id,exercice,titre')
            ->get();

        // Fiches validées en attente courrier DAF
        $enAttenteNotif = EvalFiche::where('statut', EvalStatutFiche::ValideeNotification->value)
            ->count();

        // Fiches en attente archivage
        $enAttenteArchivage = EvalFiche::where('statut', EvalStatutFiche::Notifiee->value)
            ->count();

        // Décisions de gratification enregistrées (campagne active)
        $campagne = EvalCampagne::whereNotIn('statut', ['brouillon', 'cloturee'])
            ->orderByDesc('exercice')
            ->first();

        $gratifications = $campagne
            ? EvalGratification::whereHas('fiche', fn($q) => $q->where('campagne_id', $campagne->id))
                ->selectRaw('type_decision, count(*) as nb')
                ->groupBy('type_decision')
                ->get()
            : collect();

        // Synthèses validées (historique)
        $synthesesCloturees = EvalSynthese::where('statut', 'valide_dg')
            ->with('campagne:id,exercice,titre')
            ->orderByDesc('valide_dg_at')
            ->take(5)
            ->get();

        return [
            'syntheses_a_etudier'  => $synthesesPendantes,
            'nb_en_attente_notif'  => $enAttenteNotif,
            'nb_en_attente_archiv' => $enAttenteArchivage,
            'gratifications'       => $gratifications,
            'syntheses_cloturees'  => $synthesesCloturees,
        ];
    }

    private function dashboardAgent(User $user): array
    {
        $employee = $user->linkedEmployee;

        if (! $employee) {
            return [
                'employee'     => null,
                'fiches'       => [],
                'fiche_active' => null,
                'message'      => 'Aucun dossier agent lié à ce compte utilisateur.',
            ];
        }

        $fiches = EvalFiche::where('employee_id', $employee->id)
            ->with(['campagne:id,exercice,titre,statut', 'courrier'])
            ->orderByDesc('created_at')
            ->get();

        $ficheActive = $fiches->first(fn(EvalFiche $f) => ! $f->statut->estTerminal());

        $courrierDispo = $ficheActive?->courrier?->estEnvoye() ?? false;

        return [
            'employee'      => [
                'id'          => $employee->id,
                'matricule'   => $employee->employee_number,
                'nom_complet' => trim("{$employee->first_name} {$employee->last_name}"),
            ],
            'fiches' => $fiches->map(fn(EvalFiche $f) => [
                'id'            => $f->id,
                'campagne_id'   => $f->campagne_id,
                'exercice'      => $f->campagne?->exercice,
                'statut'        => $f->statut->value,
                'statut_libelle'=> $f->statut->libelle(),
                'sous_procedure'=> $f->statut->sousProcedure(),
                'moyenne'       => $f->moyenne,
                'appreciation'  => $f->appreciation,
                'est_terminal'  => $f->statut->estTerminal(),
            ])->values(),
            'fiche_active'     => $ficheActive?->only([
                'id', 'campagne_id', 'statut', 'moyenne', 'appreciation',
                'date_entretien', 'heure_entretien', 'lieu_entretien',
                'signe_agent_at', 'notifiee_at',
            ]),
            'courrier_disponible' => $courrierDispo,
            'action_requise'   => $this->actionRequiseAgent($ficheActive),
        ];
    }

    /** Retourne un libellé d'action attendue de l'agent selon le statut de sa fiche active. */
    private function actionRequiseAgent(?EvalFiche $fiche): ?string
    {
        if (! $fiche) {
            return null;
        }

        return match ($fiche->statut) {
            EvalStatutFiche::AgentConvoque         => "Accusez réception de votre convocation d'entretien.",
            EvalStatutFiche::AttenteSignatureAgent  => "Votre fiche est prête — veuillez la signer ou motiver un refus.",
            EvalStatutFiche::CourrierEtabli         => "Votre courrier de notification est prêt. Consultez-le.",
            EvalStatutFiche::Notifiee               => "Votre fiche est notifiée — en attente d'archivage.",
            default                                => null,
        };
    }

    // ── §8.5 — Historique multi-campagnes ─────────────────────────────────

    /**
     * GET /api/eval/agents/{employee}/historique
     * Retourne toutes les fiches d'un agent sur l'ensemble des campagnes (lecture seule).
     */
    public function historiqueAgent(Employee $employee): JsonResponse
    {
        $fiches = EvalFiche::where('employee_id', $employee->id)
            ->with([
                'campagne:id,exercice,titre,statut,date_lancement',
                'evaluateur:id,name',
                'decisionRh',
                'courrier',
            ])
            ->orderByDesc('created_at')
            ->get();

        $historique = $fiches->map(fn(EvalFiche $f) => [
            'id'                  => $f->id,
            'campagne_id'         => $f->campagne_id,
            'exercice'            => $f->campagne?->exercice,
            'titre_campagne'      => $f->campagne?->titre,
            'statut'              => $f->statut->value,
            'statut_libelle'      => $f->statut->libelle(),
            'sous_procedure'      => $f->statut->sousProcedure(),
            'est_terminal'        => $f->statut->estTerminal(),
            'categorie_agent'     => $f->categorie_agent,
            'evaluateur'          => $f->evaluateur?->only(['id', 'name']),
            'moyenne'             => $f->moyenne,
            'appreciation'        => $f->appreciation,
            'observations_dg'     => $f->observations_dg,
            'avis_chef_service'   => $f->avis_chef_service,
            'ref_notation_fp'     => $f->ref_notation_fp,
            'signe_evaluateur_at' => $f->signe_evaluateur_at,
            'signe_agent_at'      => $f->signe_agent_at,
            'notifiee_at'         => $f->notifiee_at,
            'archivee_at'         => $f->archivee_at,
            'decision_rh'         => $f->decisionRh?->only(['type_decision', 'commentaire']),
            'courrier_etabli_at'  => $f->courrier_etabli_at,
            'courrier_accuse_at'  => $f->courrier?->accuse_at,
        ])->values();

        return response()->json([
            'employee' => [
                'id'          => $employee->id,
                'matricule'   => $employee->employee_number,
                'nom_complet' => trim("{$employee->first_name} {$employee->last_name}"),
                'department'  => $employee->department?->name,
            ],
            'historique'   => $historique,
            'nb_campagnes' => $historique->pluck('campagne_id')->unique()->count(),
            'nb_fiches'    => $historique->count(),
        ]);
    }
}
