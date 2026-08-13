<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvalCampagne;
use App\Models\EvalFiche;
use App\Models\EvalSynthese;
use App\Services\Eval\EvalSyntheseService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class EvalSyntheseController extends Controller
{
    public function __construct(private EvalSyntheseService $service) {}

    // ── Liste ─────────────────────────────────────────────────────────────

    /**
     * GET /eval/syntheses?campagne_id=X
     * Retourne toutes les versions du tableau pour une campagne.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['campagne_id' => 'required|exists:eval_campagnes,id']);

        $syntheses = EvalSynthese::where('campagne_id', $request->campagne_id)
            ->orderByDesc('version')
            ->get();

        return response()->json(['syntheses' => $syntheses]);
    }

    // ── Génération ────────────────────────────────────────────────────────

    /**
     * POST /eval/syntheses
     * Génère (ou régénère) le tableau de synthèse pour une campagne.
     * Seuls DAF et Division RH peuvent déclencher la génération.
     */
    public function generer(Request $request): JsonResponse
    {
        $data = $request->validate(['campagne_id' => 'required|exists:eval_campagnes,id']);

        $campagne = EvalCampagne::findOrFail($data['campagne_id']);
        $synthese = $this->service->generer($campagne, $request->user());

        return response()->json([
            'message'  => "Tableau de synthèse v{$synthese->version} généré.",
            'synthese' => $synthese,
        ]);
    }

    // ── Détail ────────────────────────────────────────────────────────────

    /** GET /eval/syntheses/{synthese} */
    public function show(EvalSynthese $synthese): JsonResponse
    {
        return response()->json(['synthese' => $synthese->load('campagne')]);
    }

    // ── Contrôle de complétude ────────────────────────────────────────────

    /**
     * GET /eval/syntheses/{synthese}/completude
     * Retourne les fiches manquantes (agents sans fiche réceptionnée).
     */
    public function completude(EvalSynthese $synthese): JsonResponse
    {
        $manquants = $this->service->agentsManquants($synthese->campagne);

        return response()->json([
            'nb_manquants' => $manquants->count(),
            'agents'       => $manquants,
        ]);
    }

    /**
     * POST /eval/syntheses/{synthese}/confirmer-completude
     * DAF confirme explicitement la complétude avant transmission au DG.
     */
    public function confirmerCompletude(Request $request, EvalSynthese $synthese): JsonResponse
    {
        try {
            $synthese = $this->service->confirmerCompletude($synthese, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Complétude confirmée. Vous pouvez transmettre au DG.",
            'synthese' => $synthese,
        ]);
    }

    // ── Relance responsable ───────────────────────────────────────────────

    /**
     * POST /eval/syntheses/{synthese}/relancer/{fiche}
     * Envoie une relance au responsable hiérarchique pour une fiche non reçue.
     */
    public function relancer(Request $request, EvalSynthese $synthese, EvalFiche $fiche): JsonResponse
    {
        $this->service->relancerResponsable($fiche, $request->user());

        return response()->json([
            'message' => "Relance envoyée au responsable hiérarchique.",
        ]);
    }

    // ── Contribution Division RH ──────────────────────────────────────────

    /**
     * PUT /eval/syntheses/{synthese}/annoter
     * Division RH peut annoter sans pouvoir transmettre au DG.
     */
    public function annoter(Request $request, EvalSynthese $synthese): JsonResponse
    {
        $data = $request->validate([
            'notes_division_rh' => 'required|string|max:5000',
        ]);

        try {
            $synthese = $this->service->annoter($synthese, $request->user(), $data['notes_division_rh']);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Annotations enregistrées.",
            'synthese' => $synthese,
        ]);
    }

    // ── Transmission au DG ────────────────────────────────────────────────

    /**
     * POST /eval/syntheses/{synthese}/transmettre-dg
     * DAF uniquement — fige le tableau et notifie le DG.
     */
    public function transmettreAuDg(Request $request, EvalSynthese $synthese): JsonResponse
    {
        try {
            $synthese = $this->service->transmettreAuDg($synthese, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Tableau de synthèse transmis au Directeur général. Toutes les fiches passent en statut « tableau_transmis_dg ».",
            'synthese' => $synthese,
        ]);
    }

    // ── Export PDF ────────────────────────────────────────────────────────

    /** GET /eval/syntheses/{synthese}/export-pdf */
    public function exporterPdf(EvalSynthese $synthese): Response
    {
        $donnees = $synthese->donnees ?? [];

        $pdf = Pdf::loadView('eval.tableau_synthese', [
            'synthese' => $synthese,
            'donnees'  => $donnees,
        ])->setPaper('a3', 'landscape');

        $filename = "tableau_synthese_{$synthese->campagne->exercice}_v{$synthese->version}.pdf";

        return $pdf->download($filename);
    }

    // ── Export Excel ──────────────────────────────────────────────────────

    /** GET /eval/syntheses/{synthese}/export-excel */
    public function exporterExcel(EvalSynthese $synthese): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $donnees = $synthese->donnees ?? [];

        $spreadsheet = new Spreadsheet();
        $this->remplirFeuilleSynthese($spreadsheet, $synthese, $donnees);

        $exercice = $synthese->campagne->exercice ?? '';
        $filename  = "tableau_synthese_{$exercice}_v{$synthese->version}.xlsx";

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ── Helpers privés ────────────────────────────────────────────────────

    private function remplirFeuilleSynthese(Spreadsheet $spreadsheet, EvalSynthese $synthese, array $donnees): void
    {
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Synthèse');

        $campagneInfo = $donnees['campagne'] ?? [];
        $global       = $donnees['global']   ?? [];

        // En-tête
        $sheet->setCellValue('A1', 'TABLEAU DE SYNTHÈSE DES ÉVALUATIONS — ANASER');
        $sheet->setCellValue('A2', "Campagne : " . ($campagneInfo['exercice'] ?? '') . ($campagneInfo['titre'] ? " — " . $campagneInfo['titre'] : ''));
        $sheet->setCellValue('A3', "Version : " . $synthese->version . " | Statut : " . ($synthese->statut === 'transmis' ? 'TRANSMIS AU DG' : 'Brouillon'));
        $sheet->setCellValue('A4', "Généré le : " . ($donnees['genere_at'] ?? ''));

        // Résumé global
        $row = 6;
        $sheet->setCellValue("A{$row}", 'RÉSUMÉ GLOBAL');
        $row++;
        $sheet->setCellValue("A{$row}", 'Fiches intégrées');
        $sheet->setCellValue("B{$row}", $global['nb_fiches_integrees'] ?? 0);
        $row++;
        $sheet->setCellValue("A{$row}", 'Moyenne globale');
        $sheet->setCellValue("B{$row}", $global['moyenne_globale'] ?? 'N/A');
        $row++;

        // Par structure
        $row += 2;
        $sheet->setCellValue("A{$row}", 'RÉSULTATS PAR STRUCTURE');
        $row++;
        $sheet->setCellValue("A{$row}", 'Structure');
        $sheet->setCellValue("B{$row}", 'Effectif évalué');
        $sheet->setCellValue("C{$row}", 'Moyenne');
        $row++;

        foreach ($donnees['par_structure'] ?? [] as $struct) {
            $sheet->setCellValue("A{$row}", $struct['department_nom'] ?? '');
            $sheet->setCellValue("B{$row}", $struct['nb_evalues'] ?? 0);
            $sheet->setCellValue("C{$row}", $struct['moyenne'] ?? 'N/A');
            $row++;
        }

        // Par critère
        $row += 2;
        $sheet->setCellValue("A{$row}", 'MOYENNES PAR CRITÈRE');
        $row++;
        $sheet->setCellValue("A{$row}", 'Critère');
        $sheet->setCellValue("B{$row}", 'Type');
        $sheet->setCellValue("C{$row}", 'Moyenne');
        $row++;

        foreach ($donnees['par_critere'] ?? [] as $critere) {
            $sheet->setCellValue("A{$row}", $critere['critere_nom'] ?? '');
            $sheet->setCellValue("B{$row}", $critere['type'] ?? '');
            $sheet->setCellValue("C{$row}", $critere['moyenne'] ?? 'N/A');
            $row++;
        }

        // Besoins de formation
        $row += 2;
        $sheet->setCellValue("A{$row}", 'BESOINS DE FORMATION EXPRIMÉS');
        $row++;
        $sheet->setCellValue("A{$row}", 'Formation');
        $sheet->setCellValue("B{$row}", 'Nb demandes');
        $row++;

        foreach ($donnees['besoins_formation'] ?? [] as $formation => $nb) {
            $sheet->setCellValue("A{$row}", $formation);
            $sheet->setCellValue("B{$row}", $nb);
            $row++;
        }

        // Auto-dimensionner les colonnes A-C
        foreach (['A', 'B', 'C'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }
}
