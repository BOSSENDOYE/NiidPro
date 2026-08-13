<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvalCourrier;
use App\Models\EvalFiche;
use App\Models\EvalModeleNotification;
use App\Models\EvalSynthese;
use App\Services\Eval\EvalSp6Service;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EvalNotificationDafController extends Controller
{
    public function __construct(private EvalSp6Service $service) {}

    // ── Modèles de lettre ────────────────────────────────────────────────

    /** GET /eval/notifications-daf/modeles */
    public function modeles(): JsonResponse
    {
        return response()->json([
            'modeles'   => $this->service->modeles(),
            'variables' => EvalModeleNotification::VARIABLES,
        ]);
    }

    /** POST /eval/notifications-daf/modeles */
    public function creerModele(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom'          => 'required|string|max:200',
            'objet_lettre' => 'required|string|max:300',
            'corps_html'   => 'required|string',
            'actif'        => 'boolean',
        ]);

        $modele = $this->service->creerModele($request->user(), $data);

        return response()->json(['message' => "Modèle « {$modele->nom} » créé.", 'modele' => $modele], 201);
    }

    /** PUT /eval/notifications-daf/modeles/{modele} */
    public function mettreAJourModele(Request $request, EvalModeleNotification $modele): JsonResponse
    {
        $data = $request->validate([
            'nom'          => 'sometimes|string|max:200',
            'objet_lettre' => 'sometimes|string|max:300',
            'corps_html'   => 'sometimes|string',
            'actif'        => 'boolean',
        ]);

        $modele = $this->service->mettreAJourModele($modele, $request->user(), $data);

        return response()->json(['modele' => $modele]);
    }

    // ── Courriers d'une synthèse ──────────────────────────────────────────

    /** GET /eval/notifications-daf/{synthese}/courriers */
    public function courriers(EvalSynthese $synthese): JsonResponse
    {
        return response()->json([
            'courriers' => $this->service->courriers($synthese),
            'total'     => EvalCourrier::where('synthese_id', $synthese->id)->count(),
        ]);
    }

    // ── Génération en lot ────────────────────────────────────────────────

    /**
     * POST /eval/notifications-daf/{synthese}/generer
     * DAF génère les courriers individuels pour toutes les fiches ValideeNotification.
     */
    public function generer(Request $request, EvalSynthese $synthese): JsonResponse
    {
        $data = $request->validate([
            'modele_id' => 'required|exists:eval_modeles_notification,id',
        ]);

        $modele = EvalModeleNotification::findOrFail($data['modele_id']);

        try {
            $courriers = $this->service->genererCourriers($synthese, $modele, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'   => "{$courriers->count()} courrier(s) de notification établi(s).",
            'courriers' => $courriers,
        ]);
    }

    // ── PDF individuel ───────────────────────────────────────────────────

    /** GET /eval/notifications-daf/courriers/{courrier}/pdf */
    public function pdf(EvalCourrier $courrier): Response
    {
        $courrier->load([
            'fiche.employee.department',
            'fiche.campagne',
            'signataire:id,name',
            'synthese',
        ]);

        $pdf = Pdf::loadView('eval.courrier_notification', [
            'courrier' => $courrier,
            'fiche'    => $courrier->fiche,
        ])->setPaper('a4', 'portrait');

        $nom      = str_replace(' ', '_', $courrier->fiche?->snapshot_nom_complet ?? 'agent');
        $exercice = $courrier->fiche?->campagne?->exercice ?? 'N';
        $filename = "courrier_notification_{$nom}_{$exercice}.pdf";

        return $pdf->download($filename);
    }

    // ── Signature DAF ────────────────────────────────────────────────────

    /** POST /eval/notifications-daf/courriers/{courrier}/signer */
    public function signer(Request $request, EvalCourrier $courrier): JsonResponse
    {
        try {
            $courrier = $this->service->signerCourrier($courrier, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Courrier signé par le DAF le {$courrier->signe_at?->format('d/m/Y à H:i')}.",
            'courrier' => $courrier,
        ]);
    }

    // ── Envoi à l'agent ──────────────────────────────────────────────────

    /** POST /eval/notifications-daf/courriers/{courrier}/envoyer */
    public function envoyer(Request $request, EvalCourrier $courrier): JsonResponse
    {
        $data = $request->validate([
            'mode_envoi' => 'required|in:portail,email,main_propre',
        ]);

        try {
            $courrier = $this->service->envoyerCourrier($courrier, $request->user(), $data['mode_envoi']);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Courrier transmis à l'agent via « {$courrier->libelleMode()} ».",
            'courrier' => $courrier,
        ]);
    }

    // ── Accusé de consultation (agent) ───────────────────────────────────

    /** POST /eval/notifications-daf/courriers/{courrier}/accuser */
    public function accuser(Request $request, EvalCourrier $courrier): JsonResponse
    {
        try {
            $courrier = $this->service->accuserConsultation($courrier, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'  => "Accusé de réception enregistré.",
            'courrier' => $courrier,
        ]);
    }

    // ── Archivage fiche individuelle ─────────────────────────────────────

    /** POST /eval/notifications-daf/fiches/{fiche}/archiver */
    public function archiverFiche(Request $request, EvalFiche $fiche): JsonResponse
    {
        try {
            $fiche = $this->service->archiverFiche($fiche, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => "Fiche de {$fiche->snapshot_nom_complet} archivée définitivement.",
            'fiche'   => $fiche,
        ]);
    }

    // ── Archivage en lot ─────────────────────────────────────────────────

    /** POST /eval/notifications-daf/{synthese}/archiver-lot */
    public function archiverLot(Request $request, EvalSynthese $synthese): JsonResponse
    {
        $count = $this->service->archiverLot($synthese, $request->user());

        return response()->json([
            'message'      => "{$count} fiche(s) archivée(s) définitivement.",
            'nb_archivees' => $count,
        ]);
    }
}
