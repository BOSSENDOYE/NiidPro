<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormationAction;
use App\Models\FormationBesoin;
use App\Models\FormationEvaluation;
use App\Models\FormationInscription;
use App\Models\FormationPrestataire;
use App\Models\FormationSession;
use App\Models\LignePlanFormation;
use App\Models\PlanFormation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PlanFormationController extends Controller
{
    // ─── DASHBOARD ───────────────────────────────────────────────────────
    public function dashboard(): JsonResponse
    {
        $annee = now()->year;

        $effectifTotal = DB::table('employees')->count();

        // Agents formés cette année (inscriptions présentes ou certifiées)
        $agentFormes = DB::table('formation_inscriptions')
            ->join('formation_sessions', 'formation_inscriptions.session_id', '=', 'formation_sessions.id')
            ->join('lignes_plan_formation', 'formation_sessions.ligne_plan_id', '=', 'lignes_plan_formation.id')
            ->join('plans_formation', 'lignes_plan_formation.plan_formation_id', '=', 'plans_formation.id')
            ->where('plans_formation.annee', $annee)
            ->whereIn('formation_inscriptions.statut', ['present', 'certifie'])
            ->distinct('formation_inscriptions.employee_id')
            ->count('formation_inscriptions.employee_id');

        $tauxAcces = $effectifTotal > 0 ? round($agentFormes / $effectifTotal * 100, 1) : 0;

        // Jours de formation totaux cette année
        $joursTotal = DB::table('formation_inscriptions')
            ->join('formation_sessions', 'formation_inscriptions.session_id', '=', 'formation_sessions.id')
            ->join('lignes_plan_formation', 'formation_sessions.ligne_plan_id', '=', 'lignes_plan_formation.id')
            ->join('formation_actions', 'lignes_plan_formation.action_id', '=', 'formation_actions.id')
            ->join('plans_formation', 'lignes_plan_formation.plan_formation_id', '=', 'plans_formation.id')
            ->where('plans_formation.annee', $annee)
            ->whereIn('formation_inscriptions.statut', ['present', 'certifie'])
            ->sum('formation_actions.duree_jours');

        $joursMoyenParAgent = $agentFormes > 0 ? round($joursTotal / $agentFormes, 1) : 0;

        // Budget
        $planActif = PlanFormation::where('annee', $annee)->first();
        $budgetAlloue = $planActif?->enveloppe_budgetaire ?? 0;
        $budgetConsomme = FormationSession::whereHas('lignePlan.plan', fn($q) => $q->where('annee', $annee))
            ->where('statut', 'realisee')
            ->sum('cout_reel');
        $tauxBudget = $budgetAlloue > 0 ? round($budgetConsomme / $budgetAlloue * 100, 1) : 0;

        // Satisfaction à chaud
        $scoresSatisfaction = FormationEvaluation::where('type', 'a_chaud')
            ->whereYear('date_evaluation', $annee)
            ->pluck('score')
            ->filter(fn($s) => !is_null($s));
        $tauxSatisfaction = $scoresSatisfaction->count() > 0
            ? round($scoresSatisfaction->average(), 1)
            : null;

        // Transfert N+90
        $scoresTransfert = FormationEvaluation::where('type', 'transfert_n90')
            ->whereYear('date_evaluation', $annee)
            ->pluck('score')
            ->filter(fn($s) => !is_null($s));
        $tauxTransfert = $scoresTransfert->count() > 0
            ? round($scoresTransfert->average(), 1)
            : null;

        // Taux réalisation plan
        $totalActions = LignePlanFormation::whereHas('plan', fn($q) => $q->where('annee', $annee))->count();
        $actionsRealisees = FormationSession::whereHas('lignePlan.plan', fn($q) => $q->where('annee', $annee))
            ->where('statut', 'realisee')->count();
        $tauxRealisation = $totalActions > 0 ? round($actionsRealisees / $totalActions * 100, 1) : 0;

        // Prochaines sessions
        $prochainsSessions = FormationSession::with(['lignePlan.action', 'prestataire'])
            ->where('statut', 'planifiee')
            ->where('date_debut', '>=', now())
            ->orderBy('date_debut')
            ->take(5)
            ->get();

        // Plans récents
        $plansRecents = PlanFormation::withCount('lignes')
            ->orderByDesc('annee')
            ->take(5)
            ->get();

        return response()->json([
            'kpis' => [
                'taux_acces'          => $tauxAcces,
                'jours_moyen'         => $joursMoyenParAgent,
                'taux_budget'         => $tauxBudget,
                'taux_satisfaction'   => $tauxSatisfaction,
                'taux_transfert'      => $tauxTransfert,
                'taux_realisation'    => $tauxRealisation,
                'agents_formes'       => $agentFormes,
                'budget_alloue'       => $budgetAlloue,
                'budget_consomme'     => $budgetConsomme,
            ],
            'prochaines_sessions' => $prochainsSessions,
            'plans_recents'       => $plansRecents,
        ]);
    }

    // ─── PRESTATAIRES ────────────────────────────────────────────────────
    public function prestataires(): JsonResponse
    {
        return response()->json(FormationPrestataire::orderBy('nom')->get());
    }

    public function createPrestataire(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom'         => 'required|string|max:255',
            'type'        => 'required|in:externe,public,interne,bailleurs',
            'contact_nom' => 'nullable|string|max:255',
            'email'       => 'nullable|email|max:255',
            'telephone'   => 'nullable|string|max:50',
            'adresse'     => 'nullable|string|max:500',
            'statut'      => 'in:actif,inactif',
        ]);
        return response()->json(FormationPrestataire::create($data), 201);
    }

    // ─── ACTIONS (CATALOGUE) ─────────────────────────────────────────────
    public function actions(Request $request): JsonResponse
    {
        $query = FormationAction::with('prestataire')->orderBy('intitule');
        if ($request->filled('categorie')) {
            $query->where('categorie', $request->categorie);
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        return response()->json($query->get());
    }

    public function createAction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'intitule'               => 'required|string|max:255',
            'objectifs_pedagogiques' => 'nullable|string',
            'categorie'              => 'required|in:reglementaire,manageriale,metier,rh,developpement_personnel,integration',
            'duree_jours'            => 'required|numeric|min:0.5',
            'mode'                   => 'required|in:presentiel,distanciel,mixte,tutorat',
            'caractere'              => 'required|in:obligatoire,prioritaire,complementaire',
            'cout_unitaire_estime'   => 'nullable|numeric|min:0',
            'prestataire_id'         => 'nullable|exists:formation_prestataires,id',
            'statut'                 => 'in:actif,inactif',
        ]);
        return response()->json(FormationAction::create($data), 201);
    }

    // ─── BESOINS ─────────────────────────────────────────────────────────
    public function besoins(Request $request): JsonResponse
    {
        $query = FormationBesoin::with(['action', 'direction', 'employee'])
            ->orderByDesc('created_at');
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('annee')) {
            $query->where('annee', $request->annee);
        }
        return response()->json($query->get());
    }

    public function createBesoin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action_id'     => 'nullable|exists:formation_actions,id',
            'intitule_libre'=> 'nullable|string|max:255',
            'direction_id'  => 'required|exists:departments,id',
            'employee_id'   => 'nullable|exists:employees,id',
            'annee'         => 'required|integer|min:2020|max:2099',
            'source'        => 'required|in:entretien_annuel,direction,rh,reglementaire',
            'commentaire'   => 'nullable|string',
            'statut'        => 'in:collecte,retenu,rejete',
        ]);
        $data['created_by'] = Auth::id();
        return response()->json(FormationBesoin::create($data), 201);
    }

    public function validerBesoin(Request $request, FormationBesoin $besoin): JsonResponse
    {
        $data = $request->validate(['statut' => 'required|in:retenu,rejete']);
        $besoin->update($data);
        return response()->json($besoin->load(['action', 'direction', 'employee']));
    }

    // ─── PLANS ───────────────────────────────────────────────────────────
    public function plans(): JsonResponse
    {
        return response()->json(
            PlanFormation::withCount('lignes')->orderByDesc('annee')->get()
        );
    }

    public function createPlan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'annee'               => 'required|integer|min:2020|max:2099',
            'titre'               => 'required|string|max:255',
            'periode_debut'       => 'required|date',
            'periode_fin'         => 'required|date|after:periode_debut',
            'enveloppe_budgetaire'=> 'nullable|numeric|min:0',
            'notes'               => 'nullable|string',
        ]);
        $data['statut'] = 'brouillon';
        return response()->json(PlanFormation::create($data), 201);
    }

    public function showPlan(PlanFormation $plan): JsonResponse
    {
        $plan->load([
            'lignes.action.prestataire',
            'lignes.direction',
            'lignes.besoin',
            'lignes.sessions',
            'validePar',
        ]);
        return response()->json($plan);
    }

    public function validerPlan(PlanFormation $plan): JsonResponse
    {
        $plan->update([
            'statut'             => 'valide_dg',
            'valide_par_user_id' => Auth::id(),
            'date_validation'    => now(),
        ]);
        return response()->json($plan->load('validePar'));
    }

    // ─── LIGNES DU PLAN ──────────────────────────────────────────────────
    public function createLigne(Request $request, PlanFormation $plan): JsonResponse
    {
        $data = $request->validate([
            'action_id'            => 'required|exists:formation_actions,id',
            'besoin_id'            => 'nullable|exists:formation_besoins,id',
            'direction_id'         => 'required|exists:departments,id',
            'nb_participants_prevu'=> 'required|integer|min:1',
            'dates_previsionnelles'=> 'nullable|string|max:255',
            'cout_unitaire'        => 'nullable|numeric|min:0',
            'source_financement'   => 'required|in:budget_propre,3fpt,cooperation,bailleurs',
            'caractere'            => 'required|in:obligatoire,prioritaire,complementaire',
            'notes'                => 'nullable|string',
        ]);
        $data['plan_formation_id'] = $plan->id;
        $ligne = LignePlanFormation::create($data);
        return response()->json($ligne->load(['action', 'direction']), 201);
    }

    public function updateLigne(Request $request, LignePlanFormation $ligne): JsonResponse
    {
        $data = $request->validate([
            'nb_participants_prevu'=> 'integer|min:1',
            'dates_previsionnelles'=> 'nullable|string|max:255',
            'cout_unitaire'        => 'nullable|numeric|min:0',
            'source_financement'   => 'in:budget_propre,3fpt,cooperation,bailleurs',
            'caractere'            => 'in:obligatoire,prioritaire,complementaire',
            'notes'                => 'nullable|string',
        ]);
        $ligne->update($data);
        return response()->json($ligne->load(['action', 'direction']));
    }

    public function deleteLigne(LignePlanFormation $ligne): JsonResponse
    {
        $ligne->delete();
        return response()->json(null, 204);
    }

    // ─── SESSIONS ────────────────────────────────────────────────────────
    public function sessions(Request $request): JsonResponse
    {
        $query = FormationSession::with(['lignePlan.action', 'lignePlan.plan', 'prestataire'])
            ->orderBy('date_debut');
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('annee')) {
            $query->whereHas('lignePlan.plan', fn($q) => $q->where('annee', $request->annee));
        }
        return response()->json($query->get());
    }

    public function showSession(FormationSession $session): JsonResponse
    {
        $session->load([
            'lignePlan.action',
            'lignePlan.plan',
            'prestataire',
            'inscriptions.employee.department',
            'inscriptions.evaluations',
        ]);
        return response()->json($session);
    }

    public function createSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ligne_plan_id'  => 'required|exists:lignes_plan_formation,id',
            'date_debut'     => 'required|date',
            'date_fin'       => 'required|date|after_or_equal:date_debut',
            'lieu'           => 'nullable|string|max:255',
            'prestataire_id' => 'nullable|exists:formation_prestataires,id',
            'cout_reel'      => 'nullable|numeric|min:0',
            'statut'         => 'in:planifiee,en_cours,realisee,annulee',
            'notes'          => 'nullable|string',
        ]);
        $session = FormationSession::create($data);
        return response()->json($session->load(['lignePlan.action', 'prestataire']), 201);
    }

    public function updateSession(Request $request, FormationSession $session): JsonResponse
    {
        $data = $request->validate([
            'date_debut'           => 'date',
            'date_fin'             => 'date',
            'lieu'                 => 'nullable|string|max:255',
            'prestataire_id'       => 'nullable|exists:formation_prestataires,id',
            'nb_participants_reel' => 'nullable|integer|min:0',
            'cout_reel'            => 'nullable|numeric|min:0',
            'statut'               => 'in:planifiee,en_cours,realisee,annulee',
            'notes'                => 'nullable|string',
        ]);
        $session->update($data);
        return response()->json($session->load(['lignePlan.action', 'prestataire']));
    }

    // ─── INSCRIPTIONS ────────────────────────────────────────────────────
    public function inscrire(Request $request, FormationSession $session): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'statut'      => 'in:inscrit,present,absent,certifie',
            'notes'       => 'nullable|string',
        ]);
        $data['session_id'] = $session->id;
        $inscription = FormationInscription::firstOrCreate(
            ['session_id' => $session->id, 'employee_id' => $data['employee_id']],
            $data
        );
        return response()->json($inscription->load('employee'), 201);
    }

    public function updateInscription(Request $request, FormationInscription $inscription): JsonResponse
    {
        $data = $request->validate([
            'statut'           => 'in:inscrit,present,absent,certifie',
            'attestation_path' => 'nullable|string',
            'date_attestation' => 'nullable|date',
            'notes'            => 'nullable|string',
        ]);
        $inscription->update($data);
        return response()->json($inscription->load('employee'));
    }

    // ─── ÉVALUATIONS ─────────────────────────────────────────────────────
    public function evaluations(Request $request): JsonResponse
    {
        $query = FormationEvaluation::with([
            'inscription.employee',
            'inscription.session.lignePlan.action',
            'evaluePar',
        ])->orderByDesc('date_evaluation');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        return response()->json($query->take(100)->get());
    }

    public function createEvaluation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'inscription_id'   => 'required|exists:formation_inscriptions,id',
            'type'             => 'required|in:a_chaud,acquis_j30,transfert_n90',
            'score'            => 'nullable|numeric|min:0|max:100',
            'commentaire'      => 'nullable|string',
            'date_evaluation'  => 'required|date',
        ]);
        $data['evalue_par_user_id'] = Auth::id();

        $eval = FormationEvaluation::updateOrCreate(
            ['inscription_id' => $data['inscription_id'], 'type' => $data['type']],
            $data
        );
        return response()->json($eval->load(['inscription.employee', 'evaluePar']), 201);
    }
}
