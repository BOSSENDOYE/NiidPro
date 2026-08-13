<?php

namespace App\Http\Controllers\Api;

use App\Enums\EvalStatutCampagne;
use App\Http\Controllers\Controller;
use App\Models\EvalAudit;
use App\Models\EvalCampagne;
use App\Models\EvalFiche;
use App\Services\Eval\CampagneLancementService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EvalCampagneController extends Controller
{
    public function __construct(private CampagneLancementService $lancementService) {}

    // ── CRUD de base ──────────────────────────────────────────────────────

    /** GET /api/eval/campagnes */
    public function index(): JsonResponse
    {
        $campagnes = EvalCampagne::with([
            'createur:id,name',
            'lanceur:id,name',
            'referentiel:id,code,version,libelle,verrouille',
        ])
            ->orderByDesc('exercice')
            ->get()
            ->map(fn(EvalCampagne $c) => array_merge(
                $c->toArray(),
                ['stats' => $c->stats()]
            ));

        return response()->json($campagnes);
    }

    /** POST /api/eval/campagnes — Créer une campagne (brouillon) */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'exercice'                  => 'required|integer|min:2020|unique:eval_campagnes,exercice',
            'titre'                     => 'nullable|string|max:200',
            'referentiel_id'            => 'nullable|integer|exists:eval_referentiels,id',
            'periode_debut'             => 'nullable|date',
            'periode_fin'               => 'nullable|date|after_or_equal:periode_debut',
            'date_lancement'            => 'nullable|date',
            'date_limite_planification' => 'nullable|date',
            'date_limite_entretiens'    => 'nullable|date',
            'date_limite_transmission'  => 'nullable|date',
            'date_limite_synthese'      => 'nullable|date',
            'date_cloture'              => 'nullable|date',
        ]);

        $data['cree_par'] = $request->user()->id;
        $data['titre']    ??= "Campagne d'évaluation {$data['exercice']}";

        $campagne = EvalCampagne::create($data);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'campagne.creer',
            'entite_type' => 'EvalCampagne',
            'entite_id'   => $campagne->id,
        ]);

        return response()->json(
            $campagne->load(['createur:id,name', 'referentiel:id,code,version,libelle']),
            201
        );
    }

    /** GET /api/eval/campagnes/{campagne} */
    public function show(EvalCampagne $campagne): JsonResponse
    {
        return response()->json([
            'campagne' => $campagne->load([
                'createur:id,name',
                'lanceur:id,name',
                'referentiel.criteres',
            ]),
            'stats' => $campagne->stats(),
        ]);
    }

    /** PUT /api/eval/campagnes/{campagne} — Modifier le paramétrage (brouillon uniquement) */
    public function update(Request $request, EvalCampagne $campagne): JsonResponse
    {
        if ($campagne->statut !== EvalStatutCampagne::Brouillon) {
            return response()->json(['message' => 'Seule une campagne en brouillon peut être modifiée.'], 422);
        }

        $data = $request->validate([
            'titre'                     => 'nullable|string|max:200',
            'referentiel_id'            => 'nullable|integer|exists:eval_referentiels,id',
            'periode_debut'             => 'nullable|date',
            'periode_fin'               => 'nullable|date|after_or_equal:periode_debut',
            'date_lancement'            => 'nullable|date',
            'date_limite_planification' => 'nullable|date',
            'date_limite_entretiens'    => 'nullable|date',
            'date_limite_transmission'  => 'nullable|date',
            'date_limite_synthese'      => 'nullable|date',
            'date_cloture'              => 'nullable|date',
        ]);

        $campagne->update($data);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'campagne.modifier',
            'entite_type' => 'EvalCampagne',
            'entite_id'   => $campagne->id,
        ]);

        return response()->json($campagne->fresh()->load([
            'createur:id,name',
            'referentiel:id,code,version,libelle',
        ]));
    }

    /** DELETE /api/eval/campagnes/{campagne} */
    public function destroy(EvalCampagne $campagne): JsonResponse
    {
        if ($campagne->statut !== EvalStatutCampagne::Brouillon) {
            return response()->json(['message' => 'Seule une campagne en brouillon peut être supprimée.'], 422);
        }

        $campagne->delete();

        return response()->json(['message' => "Campagne \"{$campagne->titre}\" supprimée."]);
    }

    // ── SP1 — Lancer la campagne ──────────────────────────────────────────

    /**
     * GET /api/eval/campagnes/{campagne}/anomalies
     * Rapport d'anomalies organigramme (§4.2, §7.1 contrôle bloquant).
     */
    public function anomalies(EvalCampagne $campagne): JsonResponse
    {
        $rapport = $this->lancementService->rapportAnomalies();

        // Ajoute les erreurs de paramétrage de la campagne
        $erreursCampagne = $campagne->anomaliesLancement();

        return response()->json([
            'peut_lancer'         => $rapport['peut_lancer'] && empty($erreursCampagne),
            'anomalies_orga'      => $rapport['anomalies'],
            'nb_anomalies_orga'   => $rapport['nb_anomalies'],
            'erreurs_parametrage' => $erreursCampagne,
            'note_service_signee' => $campagne->note_service_signee,
        ]);
    }

    /**
     * POST /api/eval/campagnes/{campagne}/note-service
     * Génère le projet de note de service (admin RH / DG).
     */
    public function genererNoteService(Request $request, EvalCampagne $campagne): JsonResponse
    {
        if ($campagne->statut !== EvalStatutCampagne::Brouillon) {
            return response()->json(['message' => 'La campagne est déjà lancée.'], 422);
        }

        $texte = $this->lancementService->genererNoteService($campagne);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'campagne.note_service.generer',
            'entite_type' => 'EvalCampagne',
            'entite_id'   => $campagne->id,
        ]);

        return response()->json([
            'message'      => 'Note de service générée.',
            'note_service' => $texte,
        ]);
    }

    /**
     * POST /api/eval/campagnes/{campagne}/signer-note
     * Le DG signe électroniquement la note de service (ou import PDF scanné).
     */
    public function signerNoteService(Request $request, EvalCampagne $campagne): JsonResponse
    {
        if ($campagne->statut !== EvalStatutCampagne::Brouillon) {
            return response()->json(['message' => 'La campagne est déjà lancée.'], 422);
        }

        if (! $campagne->note_service) {
            return response()->json(['message' => 'Générez d\'abord la note de service avant de la signer.'], 422);
        }

        $campagne->update([
            'note_service_signee'    => true,
            'note_service_signee_at' => now(),
        ]);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'campagne.note_service.signer',
            'entite_type' => 'EvalCampagne',
            'entite_id'   => $campagne->id,
            'meta'        => ['signataire' => $request->user()->name],
        ]);

        return response()->json([
            'message'             => 'Note de service signée.',
            'note_service_signee' => true,
            'signee_at'           => $campagne->note_service_signee_at,
        ]);
    }

    /**
     * GET /api/eval/campagnes/{campagne}/note-service/pdf
     * Télécharge la note de service en PDF (horodatée si signée).
     */
    public function telechargerNoteService(EvalCampagne $campagne): Response
    {
        if (! $campagne->note_service) {
            abort(404, 'Note de service non encore générée.');
        }

        $pdf = Pdf::loadView('eval.note_service', [
            'campagne' => $campagne->load(['createur:id,name', 'lanceur:id,name']),
        ])->setPaper('a4');

        $filename = "note_service_{$campagne->exercice}.pdf";

        return $pdf->download($filename);
    }

    /**
     * PUT /api/eval/campagnes/{campagne}/lancer
     * Lance la campagne : vérifications bloquantes + génération fiches + Brouillon → Lancée.
     */
    public function lancer(Request $request, EvalCampagne $campagne): JsonResponse
    {
        try {
            $resultat = $this->lancementService->lancerCampagne($campagne, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'          => "Campagne lancée avec succès. {$resultat['fiches_generees']} fiche(s) générée(s) pour {$resultat['agents_concernes']} agent(s).",
            'campagne'         => $campagne->fresh()->load([
                'lanceur:id,name',
                'referentiel:id,code,version,libelle',
            ]),
            'stats'            => $campagne->fresh()->stats(),
            'fiches_generees'  => $resultat['fiches_generees'],
            'agents_concernes' => $resultat['agents_concernes'],
        ]);
    }

    /**
     * GET /api/eval/campagnes/{campagne}/perimetre
     * Prévisualise les agents qui seront inclus dans la campagne + détection d'anomalies.
     */
    public function perimetre(EvalCampagne $campagne): JsonResponse
    {
        $rapport   = $this->lancementService->rapportAnomalies();
        $erreurs   = $campagne->anomaliesLancement();

        // Agents actifs avec responsable hiérarchique (seront inclus)
        $inclus = \App\Models\Employee::with(['department:id,name', 'manager:id,first_name,last_name'])
            ->whereNull('termination_date')
            ->where('status', 'active')
            ->whereNotNull('manager_id')
            ->select('id', 'employee_number', 'first_name', 'last_name', 'department_id', 'manager_id', 'categorie_emploi')
            ->get()
            ->map(fn(\App\Models\Employee $e) => [
                'id'             => $e->id,
                'matricule'      => $e->employee_number,
                'nom_complet'    => trim("{$e->first_name} {$e->last_name}"),
                'direction'      => $e->department?->name,
                'categorie'      => $e->categorie_emploi,
                'responsable'    => $e->manager
                    ? trim("{$e->manager->first_name} {$e->manager->last_name}")
                    : null,
            ]);

        return response()->json([
            'nb_agents_inclus'    => $inclus->count(),
            'agents_inclus'       => $inclus,
            'anomalies_orga'      => $rapport['anomalies'],
            'nb_anomalies'        => $rapport['nb_anomalies'],
            'erreurs_parametrage' => $erreurs,
            'pret_a_lancer'       => $rapport['peut_lancer'] && empty($erreurs),
        ]);
    }

    // ── Tableau de synthèse (SP4) ─────────────────────────────────────────

    /** GET /api/eval/campagnes/{campagne}/synthese */
    public function synthese(EvalCampagne $campagne): JsonResponse
    {
        $fiches = EvalFiche::with([
            'employee:id,first_name,last_name,employee_number,department_id',
            'employee.department:id,name',
            'evaluateur:id,name',
            'besoinsFormation',
            'decisionRh',
        ])
            ->where('campagne_id', $campagne->id)
            ->whereIn('statut', [
                'transmise_daf', 'receptionee_daf', 'integree_synthese',
                'tableau_transmis_dg', 'etudiee_dg', 'annotee_dg',
                'validee_notification', 'courrier_etabli', 'notifiee', 'archivee',
            ])
            ->get();

        $parDirection = $fiches->groupBy(fn($f) => $f->employee->department?->name ?? 'Non affectée');

        $synthese = $parDirection->map(fn($fichesDir, $direction) => [
            'direction'          => $direction,
            'nb_agents'          => $fichesDir->count(),
            'moyenne_direction'  => round($fichesDir->whereNotNull('moyenne')->avg('moyenne') ?? 0, 2),
            'agents'             => $fichesDir->map(fn($f) => [
                'id'           => $f->id,
                'matricule'    => $f->snapshot_matricule,
                'nom_complet'  => $f->snapshot_nom_complet,
                'fonction'     => $f->snapshot_fonction,
                'moyenne'      => $f->moyenne,
                'appreciation' => $f->appreciation,
                'decisions'    => $f->decisionRh,
                'besoins'      => $f->besoinsFormation->pluck('intitule'),
            ]),
        ])->values();

        return response()->json([
            'campagne'        => $campagne->only(['id', 'exercice', 'titre', 'statut']),
            'synthese'        => $synthese,
            'total_fiches'    => $fiches->count(),
            'moyenne_globale' => round($fiches->whereNotNull('moyenne')->avg('moyenne') ?? 0, 2),
            'stats_campagne'  => $campagne->stats(),
        ]);
    }
}
