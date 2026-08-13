<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvalFiche;
use App\Models\EvalGratification;
use App\Models\EvalSynthese;
use App\Services\Eval\EvalSp5Service;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EvalDecisionDgController extends Controller
{
    public function __construct(private EvalSp5Service $service) {}

    // ── Ouverture pour étude ──────────────────────────────────────────────

    /**
     * POST /eval/decisions-dg/{synthese}/ouvrir-etude
     * DG (ou SG) marque le tableau comme ouvert pour étude.
     * Passe les fiches TableauTransmisDg → EtudieeeDg.
     */
    public function ouvrirEtude(Request $request, EvalSynthese $synthese): JsonResponse
    {
        try {
            $synthese = $this->service->ouvrirEtude($synthese, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Rapport de synthèse ouvert pour étude. Les fiches passent en statut « Étudiée par le DG/SG ».",
            'synthese' => $synthese,
        ]);
    }

    // ── Annotation d'une fiche individuelle ──────────────────────────────

    /**
     * PUT /eval/decisions-dg/{synthese}/fiches/{fiche}/annoter
     * DG ou SG annote une fiche individuelle (observations_dg).
     */
    public function annoterFiche(Request $request, EvalSynthese $synthese, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'annotation' => 'required|string|max:5000',
        ]);

        try {
            $fiche = $this->service->annoterFiche($fiche, $synthese, $request->user(), $data['annotation']);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => "Annotation enregistrée sur la fiche de l'agent.",
            'fiche'   => $fiche,
        ]);
    }

    // ── Décision de gratification par agent ──────────────────────────────

    /**
     * POST /eval/decisions-dg/{synthese}/fiches/{fiche}/gratification
     * DG enregistre ou met à jour la décision de gratification d'un agent.
     */
    public function enregistrerGratification(Request $request, EvalSynthese $synthese, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'type_decision' => 'required|string|in:' . implode(',', array_keys(EvalGratification::TYPES_DECISION)),
            'commentaire'   => 'nullable|string|max:3000',
        ]);

        try {
            $gratification = $this->service->enregistrerGratification(
                $synthese,
                $fiche,
                $request->user(),
                $data['type_decision'],
                $data['commentaire'] ?? null,
            );
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'      => "Décision de gratification enregistrée : " . $gratification->libelleDecision(),
            'gratification' => $gratification,
        ]);
    }

    // ── Liste des gratifications ──────────────────────────────────────────

    /**
     * GET /eval/decisions-dg/{synthese}/gratifications
     * Liste toutes les décisions de gratification pour une synthèse.
     */
    public function listeGratifications(EvalSynthese $synthese): JsonResponse
    {
        $gratifications = $this->service->gratifications($synthese);

        return response()->json([
            'gratifications' => $gratifications,
            'total'          => $gratifications->count(),
        ]);
    }

    // ── Annotation globale de la synthèse ────────────────────────────────

    /**
     * PUT /eval/decisions-dg/{synthese}/annoter-synthese
     * DG ou SG ajoute une annotation globale sur le tableau de synthèse.
     */
    public function annoterSynthese(Request $request, EvalSynthese $synthese): JsonResponse
    {
        $data = $request->validate([
            'annotation_dg' => 'required|string|max:10000',
        ]);

        try {
            $synthese = $this->service->annoterSynthese($synthese, $request->user(), $data['annotation_dg']);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Annotation globale du Directeur général enregistrée.",
            'synthese' => $synthese,
        ]);
    }

    // ── Validation et transmission au DAF ────────────────────────────────

    /**
     * POST /eval/decisions-dg/{synthese}/valider
     * DG valide le tableau annoté et le transmet au DAF pour notification.
     * Fige le tableau — irréversible (CDC §7.5).
     */
    public function valider(Request $request, EvalSynthese $synthese): JsonResponse
    {
        try {
            $synthese = $this->service->validerEtTransmettre($synthese, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Tableau de synthèse validé et transmis au DAF. Les fiches passent en statut « Validée pour notification ». Le DAF a été notifié.",
            'synthese' => $synthese,
        ]);
    }

    // ── Export PDF (tableau de synthèse annoté) ───────────────────────────

    /**
     * GET /eval/decisions-dg/{synthese}/export-pdf
     * Exporte le tableau de synthèse annoté (version DG) en PDF.
     */
    public function exporterPdf(EvalSynthese $synthese): Response
    {
        $donnees       = $synthese->donnees ?? [];
        $gratifications = $synthese->gratifications()->with('fiche.employee.department')->get();

        $pdf = Pdf::loadView('eval.tableau_annote_dg', [
            'synthese'       => $synthese->load('campagne', 'valideurDg', 'etudiantDg'),
            'donnees'        => $donnees,
            'gratifications' => $gratifications,
        ])->setPaper('a3', 'landscape');

        $exercice = $synthese->campagne->exercice ?? '';
        $filename = "tableau_annote_dg_{$exercice}_v{$synthese->version}.pdf";

        return $pdf->download($filename);
    }
}
