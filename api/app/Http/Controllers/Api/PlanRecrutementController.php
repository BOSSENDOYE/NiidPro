<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BesoinRecrutement;
use App\Models\CandidaturePlan;
use App\Models\DecisionRecrutement;
use App\Models\EtapeHistorique;
use App\Models\FichePoste;
use App\Models\LignePlan;
use App\Models\PlanPoste;
use App\Models\PlanRecrutement;
use App\Models\ProcessusRecrutement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PlanRecrutementController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // DASHBOARD
    // ─────────────────────────────────────────────────────────────

    public function dashboard(): JsonResponse
    {
        $totalPlans = PlanRecrutement::count();

        $besoinsByStatut = BesoinRecrutement::selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        $processusByStatut = ProcessusRecrutement::selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        $candidaturesByStatut = CandidaturePlan::selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        return response()->json([
            'total_plans'           => $totalPlans,
            'besoins_by_statut'     => $besoinsByStatut,
            'processus_by_statut'   => $processusByStatut,
            'candidatures_by_statut'=> $candidaturesByStatut,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POSTES (plan_postes)
    // ─────────────────────────────────────────────────────────────

    public function postes(): JsonResponse
    {
        $postes = PlanPoste::with('direction')->orderBy('titre')->get();
        return response()->json($postes);
    }

    public function createPoste(Request $request): JsonResponse
    {
        $data = $request->validate([
            'titre'               => 'required|string|max:255',
            'direction_id'        => 'required|integer|exists:departments,id',
            'classification_ccni' => 'required|string|in:A1,A2,B1,B2,C1,C2',
            'type_contrat_defaut' => 'required|string|in:CDI,CDD,DECRET,Stage',
            'statut'              => 'sometimes|string|in:actif,inactif',
        ]);

        $poste = PlanPoste::create($data);
        $poste->load('direction');

        return response()->json($poste, 201);
    }

    // ─────────────────────────────────────────────────────────────
    // BESOINS (besoins_recrutement)
    // ─────────────────────────────────────────────────────────────

    public function besoins(Request $request): JsonResponse
    {
        $query = BesoinRecrutement::with(['poste', 'direction', 'createdBy']);

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        if ($request->filled('direction_id')) {
            $query->where('direction_id', $request->direction_id);
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function createBesoin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'poste_id'     => 'required|integer|exists:plan_postes,id',
            'direction_id' => 'required|integer|exists:departments,id',
            'motif'        => 'required|string|in:depart,nouveau_besoin,projet',
            'date_constat' => 'required|date',
            'description'  => 'nullable|string',
            'statut'       => 'sometimes|string|in:collecte,valide,rejete',
        ]);

        $data['created_by'] = Auth::id();

        $besoin = BesoinRecrutement::create($data);
        $besoin->load(['poste', 'direction', 'createdBy']);

        return response()->json($besoin, 201);
    }

    public function validerBesoin(Request $request, int $id): JsonResponse
    {
        $besoin = BesoinRecrutement::findOrFail($id);

        $data = $request->validate([
            'statut' => 'required|string|in:valide,rejete',
        ]);

        $besoin->update(['statut' => $data['statut']]);

        return response()->json($besoin->fresh(['poste', 'direction', 'createdBy']));
    }

    // ─────────────────────────────────────────────────────────────
    // PLANS (plans_recrutement)
    // ─────────────────────────────────────────────────────────────

    public function plans(): JsonResponse
    {
        $plans = PlanRecrutement::withCount('lignes')
            ->orderByDesc('annee')
            ->get();

        return response()->json($plans);
    }

    public function createPlan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'annee'                => 'required|integer|min:2000|max:2100',
            'titre'                => 'required|string|max:255',
            'periode_debut'        => 'required|date',
            'periode_fin'          => 'required|date|after_or_equal:periode_debut',
            'enveloppe_budgetaire' => 'nullable|numeric|min:0',
            'statut'               => 'sometimes|string|in:brouillon,valide_dg',
            'notes'                => 'nullable|string',
        ]);

        $plan = PlanRecrutement::create($data);

        return response()->json($plan, 201);
    }

    public function showPlan(int $id): JsonResponse
    {
        $plan = PlanRecrutement::with([
            'lignes.besoin.poste',
            'lignes.besoin.direction',
            'validePar',
        ])->findOrFail($id);

        return response()->json($plan);
    }

    public function updatePlan(Request $request, int $id): JsonResponse
    {
        $plan = PlanRecrutement::findOrFail($id);

        $data = $request->validate([
            'annee'                => 'sometimes|integer|min:2000|max:2100',
            'titre'                => 'sometimes|string|max:255',
            'periode_debut'        => 'sometimes|date',
            'periode_fin'          => 'sometimes|date',
            'enveloppe_budgetaire' => 'nullable|numeric|min:0',
            'notes'                => 'nullable|string',
        ]);

        $plan->update($data);

        return response()->json($plan->fresh());
    }

    public function validerPlan(Request $request, int $id): JsonResponse
    {
        $plan = PlanRecrutement::findOrFail($id);

        $plan->update([
            'statut'             => 'valide_dg',
            'valide_par_user_id' => Auth::id(),
            'date_validation'    => now(),
        ]);

        return response()->json($plan->fresh(['validePar']));
    }

    // ─────────────────────────────────────────────────────────────
    // LIGNES (lignes_plan)
    // ─────────────────────────────────────────────────────────────

    public function createLigne(Request $request, int $planId): JsonResponse
    {
        $plan = PlanRecrutement::findOrFail($planId);

        $data = $request->validate([
            'besoin_id'                 => 'nullable|integer|exists:besoins_recrutement,id',
            'classification_ccni'       => 'required|string|in:A1,A2,B1,B2,C1,C2',
            'type_contrat'              => 'required|string|in:CDI,CDD,DECRET,Stage',
            'duree_cdd'                 => 'nullable|integer|min:1',
            'salaire_base_estime'       => 'nullable|numeric|min:0',
            'cout_estime'               => 'nullable|numeric|min:0',
            'urgence_operationnelle'    => 'sometimes|integer|min:1|max:5',
            'impact_reglementaire'      => 'sometimes|integer|min:1|max:5',
            'disponibilite_budgetaire'  => 'sometimes|integer|min:1|max:5',
            'profil_marche_disponible'  => 'sometimes|integer|min:1|max:5',
            'notes'                     => 'nullable|string',
        ]);

        $data['plan_recrutement_id'] = $plan->id;

        // LignePlan::boot() will auto-calculate priorite_score and cout_estime
        $ligne = LignePlan::create($data);
        $ligne->load(['besoin.poste', 'besoin.direction']);

        return response()->json($ligne, 201);
    }

    public function updateLigne(Request $request, int $id): JsonResponse
    {
        $ligne = LignePlan::findOrFail($id);

        $data = $request->validate([
            'besoin_id'                 => 'nullable|integer|exists:besoins_recrutement,id',
            'classification_ccni'       => 'sometimes|string|in:A1,A2,B1,B2,C1,C2',
            'type_contrat'              => 'sometimes|string|in:CDI,CDD,DECRET,Stage',
            'duree_cdd'                 => 'nullable|integer|min:1',
            'salaire_base_estime'       => 'nullable|numeric|min:0',
            'cout_estime'               => 'nullable|numeric|min:0',
            'urgence_operationnelle'    => 'sometimes|integer|min:1|max:5',
            'impact_reglementaire'      => 'sometimes|integer|min:1|max:5',
            'disponibilite_budgetaire'  => 'sometimes|integer|min:1|max:5',
            'profil_marche_disponible'  => 'sometimes|integer|min:1|max:5',
            'notes'                     => 'nullable|string',
        ]);

        $ligne->update($data);

        return response()->json($ligne->fresh(['besoin.poste', 'besoin.direction']));
    }

    public function deleteLigne(int $id): JsonResponse
    {
        $ligne = LignePlan::findOrFail($id);
        $ligne->delete();

        return response()->json(['message' => 'Ligne supprimée avec succès.']);
    }

    // ─────────────────────────────────────────────────────────────
    // FICHES DE POSTE (fiches_poste)
    // ─────────────────────────────────────────────────────────────

    public function fichesPoste(int $pospeId): JsonResponse
    {
        $fiches = FichePoste::with(['poste', 'validePar'])
            ->where('poste_id', $pospeId)
            ->orderByDesc('version')
            ->get();

        return response()->json($fiches);
    }

    public function createFiche(Request $request): JsonResponse
    {
        $data = $request->validate([
            'poste_id'            => 'required|integer|exists:plan_postes,id',
            'version'             => 'sometimes|integer|min:1',
            'contenu_json'        => 'required|array',
            'classification_ccni' => 'required|string|in:A1,A2,B1,B2,C1,C2',
            'statut'              => 'sometimes|string|in:brouillon,valide_sg',
        ]);

        // Auto-increment version if not provided
        if (!isset($data['version'])) {
            $lastVersion = FichePoste::where('poste_id', $data['poste_id'])->max('version') ?? 0;
            $data['version'] = $lastVersion + 1;
        }

        $fiche = FichePoste::create($data);
        $fiche->load(['poste', 'validePar']);

        return response()->json($fiche, 201);
    }

    // ─────────────────────────────────────────────────────────────
    // PROCESSUS (processus_recrutement)
    // ─────────────────────────────────────────────────────────────

    public function processus(Request $request): JsonResponse
    {
        $query = ProcessusRecrutement::with([
            'lignePlan.planRecrutement',
            'lignePlan.besoin.poste',
        ]);

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function showProcessus(int $id): JsonResponse
    {
        $processus = ProcessusRecrutement::with([
            'lignePlan.planRecrutement',
            'lignePlan.besoin.poste',
            'etapesHistorique.validePar',
            'commissionMembres.user',
            'candidatures',
            'decisions.candidature',
            'decisions.validePar',
            'decisions.contrat.rapportsEssai',
        ])->findOrFail($id);

        return response()->json($processus);
    }

    public function createProcessus(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ligne_plan_id'  => 'required|integer|exists:lignes_plan,id',
            'etape_courante' => 'sometimes|string|in:analyse_besoin,elaboration_fiche,publication,selection_cv,tests_ecrits,entretien_rh,entretien_commission,deliberation,decision_dg,integration,essai,cloture',
            'statut'         => 'sometimes|string|in:en_cours,cloture,abandonne',
            'date_demarrage' => 'required|date',
            'notes'          => 'nullable|string',
        ]);

        $processus = ProcessusRecrutement::create($data);

        // Log the initial step
        EtapeHistorique::create([
            'processus_id'       => $processus->id,
            'etape'              => $processus->etape_courante,
            'date_entree'        => now(),
            'valide_par_user_id' => Auth::id(),
            'role_validateur'    => 'initiateur',
        ]);

        $processus->load(['lignePlan.planRecrutement', 'lignePlan.besoin.poste']);

        return response()->json($processus, 201);
    }

    public function avancerEtape(Request $request, int $id): JsonResponse
    {
        $processus = ProcessusRecrutement::findOrFail($id);

        $data = $request->validate([
            'etape'           => 'required|string|in:analyse_besoin,elaboration_fiche,publication,selection_cv,tests_ecrits,entretien_rh,entretien_commission,deliberation,decision_dg,integration,essai,cloture',
            'commentaire'     => 'nullable|string',
            'role_validateur' => 'nullable|string|max:255',
        ]);

        // Close current step in history
        EtapeHistorique::where('processus_id', $processus->id)
            ->where('etape', $processus->etape_courante)
            ->whereNull('date_sortie')
            ->update(['date_sortie' => now()]);

        // Advance the process step
        $processus->update(['etape_courante' => $data['etape']]);

        // If the new step is 'cloture', mark the processus as closed
        if ($data['etape'] === 'cloture') {
            $processus->update(['statut' => 'cloture']);
        }

        // Log new step
        EtapeHistorique::create([
            'processus_id'       => $processus->id,
            'etape'              => $data['etape'],
            'date_entree'        => now(),
            'valide_par_user_id' => Auth::id(),
            'role_validateur'    => $data['role_validateur'] ?? null,
            'commentaire'        => $data['commentaire'] ?? null,
        ]);

        return response()->json($processus->fresh(['etapesHistorique.validePar']));
    }

    // ─────────────────────────────────────────────────────────────
    // CANDIDATURES (candidatures_plan)
    // ─────────────────────────────────────────────────────────────

    public function candidatures(int $processusId): JsonResponse
    {
        $processus = ProcessusRecrutement::findOrFail($processusId);

        $candidatures = $processus->candidatures()->orderByDesc('created_at')->get();

        return response()->json($candidatures);
    }

    public function createCandidature(Request $request): JsonResponse
    {
        $data = $request->validate([
            'processus_id' => 'required|integer|exists:processus_recrutement,id',
            'nom'          => 'required|string|max:255',
            'prenom'       => 'required|string|max:255',
            'email'        => 'nullable|email|max:255',
            'telephone'    => 'nullable|string|max:50',
            'cv_path'      => 'nullable|string|max:500',
            'lettre_path'  => 'nullable|string|max:500',
            'statut'       => 'sometimes|string|in:recu,shortliste,test,entretien,retenu,rejete',
            'score'        => 'nullable|numeric|min:0|max:100',
            'notes'        => 'nullable|string',
        ]);

        $candidature = CandidaturePlan::create($data);

        return response()->json($candidature, 201);
    }

    public function updateCandidature(Request $request, int $id): JsonResponse
    {
        $candidature = CandidaturePlan::findOrFail($id);

        $data = $request->validate([
            'nom'         => 'sometimes|string|max:255',
            'prenom'      => 'sometimes|string|max:255',
            'email'       => 'nullable|email|max:255',
            'telephone'   => 'nullable|string|max:50',
            'cv_path'     => 'nullable|string|max:500',
            'lettre_path' => 'nullable|string|max:500',
            'statut'      => 'sometimes|string|in:recu,shortliste,test,entretien,retenu,rejete',
            'score'       => 'nullable|numeric|min:0|max:100',
            'notes'       => 'nullable|string',
        ]);

        $candidature->update($data);

        return response()->json($candidature->fresh());
    }

    // ─────────────────────────────────────────────────────────────
    // DÉCISIONS (decisions_recrutement)
    // ─────────────────────────────────────────────────────────────

    public function createDecision(Request $request): JsonResponse
    {
        $data = $request->validate([
            'processus_id'   => 'required|integer|exists:processus_recrutement,id',
            'candidature_id' => 'nullable|integer|exists:candidatures_plan,id',
            'type'           => 'required|string|in:recrute,non_recrute,reporte,annule',
            'commentaire'    => 'nullable|string',
            'date_decision'  => 'required|date',
        ]);

        $data['valide_par_dg_user_id'] = Auth::id();

        $decision = DecisionRecrutement::create($data);
        $decision->load(['candidature', 'validePar']);

        return response()->json($decision, 201);
    }
}
