<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationCritere;
use App\Models\EvaluationHistorique;
use App\Models\EvaluationNote;
use App\Models\EvaluationPeriodeEssai;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class EvaluationController extends Controller
{
    // ── Tableau de bord ──────────────────────────────────────────────────────
    public function dashboard(): JsonResponse
    {
        $total         = EvaluationPeriodeEssai::count();
        $en_cours      = EvaluationPeriodeEssai::where('statut_dossier', 'en_cours')->count();
        $confirmes     = EvaluationPeriodeEssai::where('statut_dossier', 'confirme')->count();
        $renouveles    = EvaluationPeriodeEssai::where('statut_dossier', 'renouvele')->count();
        $non_confirmes = EvaluationPeriodeEssai::where('statut_dossier', 'non_confirme')->count();
        $en_attente    = EvaluationPeriodeEssai::where('statut_dossier', 'en_attente')->count();

        $prochains_entretiens = EvaluationPeriodeEssai::with('employee')
            ->whereNotNull('date_entretien')
            ->where('date_entretien', '>=', Carbon::today())
            ->where('date_entretien', '<=', Carbon::today()->addDays(30))
            ->whereNotIn('statut', ['archive'])
            ->orderBy('date_entretien')
            ->limit(10)
            ->get();

        $recents = EvaluationPeriodeEssai::with('employee')
            ->latest()
            ->limit(8)
            ->get();

        $repartition = EvaluationPeriodeEssai::selectRaw('appreciation, COUNT(*) as count')
            ->whereNotNull('appreciation')
            ->groupBy('appreciation')
            ->get();

        $a_echoir = EvaluationPeriodeEssai::with('employee')
            ->where('date_fin_periode', '<=', Carbon::today()->addDays(14))
            ->where('date_fin_periode', '>=', Carbon::today())
            ->whereNotIn('statut', ['archive', 'decision_dg'])
            ->orderBy('date_fin_periode')
            ->limit(5)
            ->get();

        return response()->json([
            'total'                => $total,
            'en_cours'             => $en_cours,
            'confirmes'            => $confirmes,
            'renouveles'           => $renouveles,
            'non_confirmes'        => $non_confirmes,
            'en_attente'           => $en_attente,
            'prochains_entretiens' => $prochains_entretiens,
            'recents'              => $recents,
            'repartition'          => $repartition,
            'a_echoir'             => $a_echoir,
        ]);
    }

    // ── Critères ─────────────────────────────────────────────────────────────
    public function criteres(): JsonResponse
    {
        return response()->json(
            EvaluationCritere::where('actif', true)->orderBy('ordre')->get()
        );
    }

    // ── Liste évaluations ────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $query = EvaluationPeriodeEssai::with(['employee', 'responsable'])
            ->latest();

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('statut_dossier')) {
            $query->where('statut_dossier', $request->statut_dossier);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('categorie')) {
            $query->where('categorie', $request->categorie);
        }

        return response()->json($query->get());
    }

    // ── Créer une évaluation ─────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'      => 'required|integer|exists:employees,id',
            'responsable_id'   => 'nullable|integer|exists:users,id',
            'type'             => 'required|in:3_mois,6_mois',
            'categorie'        => 'required|in:A1,A2,B1,B2,C,D,E',
            'date_prise_poste' => 'required|date',
            'date_fin_periode' => 'required|date|after:date_prise_poste',
            'date_entretien'   => 'nullable|date',
        ]);

        $evaluation = EvaluationPeriodeEssai::create($data);

        EvaluationHistorique::create([
            'evaluation_id' => $evaluation->id,
            'user_id'       => $request->user()?->id ?? 1,
            'etape'         => 'creation',
            'commentaire'   => "Fiche d'évaluation créée.",
        ]);

        return response()->json($evaluation->load('employee'), 201);
    }

    // ── Détail évaluation ────────────────────────────────────────────────────
    public function show($id): JsonResponse
    {
        $evaluation = EvaluationPeriodeEssai::with([
            'employee',
            'responsable',
            'notations.critere',
            'historique.user',
            'valideRrhUser',
            'decisionDgUser',
        ])->findOrFail($id);

        return response()->json($evaluation);
    }

    // ── Sauvegarder les notes du responsable ─────────────────────────────────
    public function saveNotes(Request $request, $id): JsonResponse
    {
        $evaluation = EvaluationPeriodeEssai::findOrFail($id);

        $data = $request->validate([
            'notations'                            => 'required|array',
            'notations.*.critere_id'               => 'required|integer|exists:evaluation_criteres,id',
            'notations.*.note'                     => 'required|integer|between:1,4',
            'notations.*.commentaire_hierarchique' => 'nullable|string',
            'commentaire_general'                  => 'nullable|string',
            'plan_amelioration'                    => 'nullable|string',
        ]);

        foreach ($data['notations'] as $noteData) {
            $critere = EvaluationCritere::find($noteData['critere_id']);
            EvaluationNote::updateOrCreate(
                ['evaluation_id' => $evaluation->id, 'critere_id' => $noteData['critere_id']],
                [
                    'note'                     => $noteData['note'],
                    'note_ponderee'            => round((float) $noteData['note'] * $critere->poids, 4),
                    'commentaire_hierarchique' => $noteData['commentaire_hierarchique'] ?? null,
                ]
            );
        }

        if (array_key_exists('commentaire_general', $data)) {
            $evaluation->commentaire_general = $data['commentaire_general'];
        }
        if (array_key_exists('plan_amelioration', $data)) {
            $evaluation->plan_amelioration = $data['plan_amelioration'];
        }
        $evaluation->save();

        $evaluation->recalculerNote();

        return response()->json($evaluation->load(['employee', 'responsable', 'notations.critere', 'historique.user']));
    }

    // ── Commentaires auto-évaluation de l'agent ──────────────────────────────
    public function autoEvaluation(Request $request, $id): JsonResponse
    {
        $evaluation = EvaluationPeriodeEssai::findOrFail($id);

        $data = $request->validate([
            'notations'                      => 'required|array',
            'notations.*.critere_id'         => 'required|integer|exists:evaluation_criteres,id',
            'notations.*.commentaire_agent'  => 'nullable|string',
        ]);

        foreach ($data['notations'] as $item) {
            EvaluationNote::updateOrCreate(
                ['evaluation_id' => $evaluation->id, 'critere_id' => $item['critere_id']],
                ['commentaire_agent' => $item['commentaire_agent'] ?? null]
            );
        }

        return response()->json($evaluation->load(['notations.critere']));
    }

    // ── Avancer dans le workflow ─────────────────────────────────────────────
    // brouillon → auto_evaluation → entretien → signe → (RRH) → (DG) → archive
    public function avancer(Request $request, $id): JsonResponse
    {
        $evaluation = EvaluationPeriodeEssai::findOrFail($id);
        $userId     = $request->user()?->id ?? 1;

        $transitions = [
            'brouillon'       => ['next' => 'auto_evaluation', 'label' => "Fiche envoyée à l'agent pour auto-évaluation."],
            'auto_evaluation' => ['next' => 'entretien',       'label' => "Entretien d'évaluation lancé."],
            'entretien'       => ['next' => 'signe',           'label' => "Fiche signée par le responsable hiérarchique."],
            'decision_dg'     => ['next' => 'archive',         'label' => "Dossier archivé."],
        ];

        if (!isset($transitions[$evaluation->statut])) {
            return response()->json(['message' => 'Transition non autorisée depuis ce statut.'], 422);
        }

        $transition = $transitions[$evaluation->statut];

        if ($evaluation->statut === 'brouillon') {
            $evaluation->date_envoi_fiche = Carbon::today();
        }
        if ($evaluation->statut === 'entretien') {
            $evaluation->signe_hierarchique_at = now();
            $evaluation->signe_agent_at        = now();
        }

        $evaluation->statut = $transition['next'];
        $evaluation->save();

        EvaluationHistorique::create([
            'evaluation_id' => $evaluation->id,
            'user_id'       => $userId,
            'etape'         => $transition['next'],
            'commentaire'   => $request->input('commentaire') ?? $transition['label'],
        ]);

        return response()->json($evaluation->load(['employee', 'responsable', 'notations.critere', 'historique.user']));
    }

    // ── Validation RRH ───────────────────────────────────────────────────────
    public function validerRrh(Request $request, $id): JsonResponse
    {
        $evaluation = EvaluationPeriodeEssai::findOrFail($id);

        if ($evaluation->statut !== 'signe') {
            return response()->json(['message' => "L'évaluation doit être signée avant validation RRH."], 422);
        }

        $userId = $request->user()?->id ?? 2;

        $evaluation->statut            = 'valide_rrh';
        $evaluation->valide_rrh_at     = now();
        $evaluation->valide_rrh_user_id = $userId;
        $evaluation->save();

        EvaluationHistorique::create([
            'evaluation_id' => $evaluation->id,
            'user_id'       => $userId,
            'etape'         => 'valide_rrh',
            'commentaire'   => $request->input('commentaire') ?? "Avis RRH favorable — transmis au Directeur Général.",
        ]);

        return response()->json($evaluation->load(['employee', 'responsable', 'notations.critere', 'historique.user', 'valideRrhUser']));
    }

    // ── Décision DG ──────────────────────────────────────────────────────────
    public function decisionDg(Request $request, $id): JsonResponse
    {
        $evaluation = EvaluationPeriodeEssai::findOrFail($id);

        if ($evaluation->statut !== 'valide_rrh') {
            return response()->json(['message' => "L'évaluation doit être validée par la RRH avant la décision du DG."], 422);
        }

        $data = $request->validate([
            'decision_finale'  => 'required|in:confirmation,renouvellement,non_confirmation',
            'remarques_dg'     => 'nullable|string',
        ]);

        $userId = $request->user()?->id ?? 1;

        $statutDossierMap = [
            'confirmation'    => 'confirme',
            'renouvellement'  => 'renouvele',
            'non_confirmation'=> 'non_confirme',
        ];

        $evaluation->statut            = 'decision_dg';
        $evaluation->decision_finale   = $data['decision_finale'];
        $evaluation->remarques_dg      = $data['remarques_dg'] ?? null;
        $evaluation->statut_dossier    = $statutDossierMap[$data['decision_finale']];
        $evaluation->decision_dg_at    = now();
        $evaluation->decision_dg_user_id = $userId;
        $evaluation->save();

        EvaluationHistorique::create([
            'evaluation_id' => $evaluation->id,
            'user_id'       => $userId,
            'etape'         => 'decision_dg',
            'commentaire'   => "Décision DG : " . strtoupper(str_replace('_', ' ', $data['decision_finale'])) . ($data['remarques_dg'] ? " — " . $data['remarques_dg'] : ''),
        ]);

        return response()->json($evaluation->load(['employee', 'responsable', 'notations.critere', 'historique.user', 'decisionDgUser']));
    }
}
