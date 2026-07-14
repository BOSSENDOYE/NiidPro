<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvalAudit;
use App\Models\EvalBesoinFormation;
use App\Models\EvalCritere;
use App\Models\EvalDecisionRh;
use App\Models\EvalFiche;
use App\Models\EvalNotation;
use App\Models\EvalObjectif;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvalFicheController extends Controller
{
    /** POST /api/eval/fiches — Créer une fiche individuelle pour un agent */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'campagne_id'   => 'required|integer|exists:eval_campagnes,id',
            'employee_id'   => 'required|integer|exists:employees,id',
            'evaluateur_id' => 'nullable|integer|exists:users,id',
            'statut_agent'  => 'nullable|in:contractuel,fonctionnaire,decisionnaire',
        ]);

        // Empêcher les doublons
        if (EvalFiche::where('campagne_id', $data['campagne_id'])
            ->where('employee_id', $data['employee_id'])->exists()) {
            return response()->json(['message' => 'Une fiche existe déjà pour cet agent dans cette campagne.'], 422);
        }

        $employee = \App\Models\Employee::findOrFail($data['employee_id']);
        $anciennete = $employee->hire_date
            ? (int) \Illuminate\Support\Carbon::parse($employee->hire_date)->diffInMonths(now())
            : null;

        $fiche = EvalFiche::create([
            'campagne_id'             => $data['campagne_id'],
            'employee_id'             => $data['employee_id'],
            'evaluateur_id'           => $data['evaluateur_id'] ?? null,
            'statut'                  => 'a_planifier',
            'statut_agent'            => $data['statut_agent'] ?? 'contractuel',
            'snapshot_matricule'      => $employee->employee_number,
            'snapshot_fonction'       => $employee->fonction,
            'snapshot_direction'      => $employee->department?->name,
            'snapshot_service'        => $employee->position?->title,
            'snapshot_anciennete_mois'=> $anciennete,
        ]);

        EvalAudit::create([
            'user_id'     => $request->user()?->id,
            'action'      => 'fiche.creer',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);

        return response()->json($fiche->load(['employee', 'evaluateur:id,name']), 201);
    }

    /** GET /api/eval/fiches */
    public function index(Request $request): JsonResponse
    {
        $query = EvalFiche::with([
            'employee:id,first_name,last_name,employee_number,department_id',
            'employee.department:id,name',
            'evaluateur:id,name',
            'campagne:id,exercice,titre,statut',
        ]);

        if ($request->filled('campagne_id')) {
            $query->where('campagne_id', $request->campagne_id);
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('evaluateur_id')) {
            $query->where('evaluateur_id', $request->evaluateur_id);
        }
        if ($request->filled('statut_agent')) {
            $query->where('statut_agent', $request->statut_agent);
        }

        return response()->json($query->orderByDesc('updated_at')->get());
    }

    /** GET /api/eval/fiches/{id} */
    public function show(EvalFiche $fiche): JsonResponse
    {
        $fiche->load([
            'employee',
            'employee.department',
            'evaluateur:id,name',
            'campagne:id,exercice,titre,statut,periode_debut,periode_fin',
            'notations.critere',
            'besoinsFormation',
            'objectifs',
            'decisionRh',
        ]);

        // Critères applicables selon statut agent
        $criteres = EvalCritere::pourStatutAgent($fiche->statut_agent);

        return response()->json([
            'fiche'    => $fiche,
            'criteres' => $criteres,
        ]);
    }

    /** PUT /api/eval/fiches/{id}/planifier — Sous-procédure 2 (CDC §7.2) */
    public function planifier(Request $request, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'date_entretien' => 'required|date',
            'lieu_entretien' => 'nullable|string|max:200',
        ]);

        if (!in_array($fiche->statut, ['a_planifier', 'planifiee'])) {
            return response()->json(['message' => 'Cette fiche ne peut plus être planifiée.'], 422);
        }

        $fiche->update(array_merge($data, ['statut' => 'planifiee']));
        $fiche->audit($request->user()?->id, 'fiche.planifier', $data);

        return response()->json($fiche->fresh()->load(['employee', 'evaluateur:id,name']));
    }

    /** PUT /api/eval/fiches/{id}/noter — Sous-procédure 3 : saisie des notes (CDC §7.3 + §8.2) */
    public function noter(Request $request, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'notations'              => 'required|array|min:1',
            'notations.*.critere_id' => 'required|integer|exists:eval_criteres,id',
            'notations.*.note'       => 'required|integer|between:1,5',
            'notations.*.observation'=> 'nullable|string|max:1000',
            'realisations'           => 'nullable|string',
            'difficultes'            => 'nullable|string',
            'competences_demontrees' => 'nullable|string',
            'observations_evaluateur'=> 'nullable|string',
            'entretien_tenu'         => 'nullable|boolean',
        ]);

        foreach ($data['notations'] as $n) {
            EvalNotation::updateOrCreate(
                ['fiche_id' => $fiche->id, 'critere_id' => $n['critere_id']],
                ['note' => $n['note'], 'observation' => $n['observation'] ?? null]
            );
        }

        $fiche->update([
            'statut'                  => 'en_cours',
            'realisations'            => $data['realisations'] ?? $fiche->realisations,
            'difficultes'             => $data['difficultes'] ?? $fiche->difficultes,
            'competences_demontrees'  => $data['competences_demontrees'] ?? $fiche->competences_demontrees,
            'observations_evaluateur' => $data['observations_evaluateur'] ?? $fiche->observations_evaluateur,
            'entretien_tenu'          => $data['entretien_tenu'] ?? $fiche->entretien_tenu,
            'entretien_tenu_at'       => ($data['entretien_tenu'] ?? false) && !$fiche->entretien_tenu_at
                ? now() : $fiche->entretien_tenu_at,
        ]);

        $fiche->recalculerMoyenne();
        $fiche->audit($request->user()?->id, 'fiche.noter');

        return response()->json($fiche->fresh()->load(['notations.critere', 'employee', 'evaluateur:id,name']));
    }

    /** PUT /api/eval/fiches/{id}/besoins — Sauvegarder besoins de formation (CDC §8.3) */
    public function sauvegarderBesoins(Request $request, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'besoins'            => 'required|array',
            'besoins.*.intitule' => 'required|string|max:300',
            'besoins.*.priorite' => 'required|in:haute,moyenne,faible',
        ]);

        $fiche->besoinsFormation()->delete();

        foreach ($data['besoins'] as $i => $b) {
            EvalBesoinFormation::create([
                'fiche_id' => $fiche->id,
                'intitule' => $b['intitule'],
                'priorite' => $b['priorite'],
                'ordre'    => $i,
            ]);
        }

        return response()->json($fiche->fresh()->load('besoinsFormation'));
    }

    /** PUT /api/eval/fiches/{id}/objectifs — Sauvegarder objectifs N+1 (CDC §8.4) */
    public function sauvegarderObjectifs(Request $request, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'objectifs'              => 'required|array',
            'objectifs.*.objectif'   => 'required|string|max:500',
            'objectifs.*.indicateur' => 'nullable|string|max:300',
            'objectifs.*.echeance'   => 'nullable|date',
        ]);

        $fiche->objectifs()->delete();

        foreach ($data['objectifs'] as $i => $o) {
            EvalObjectif::create([
                'fiche_id'   => $fiche->id,
                'objectif'   => $o['objectif'],
                'indicateur' => $o['indicateur'] ?? null,
                'echeance'   => $o['echeance'] ?? null,
                'ordre'      => $i,
            ]);
        }

        return response()->json($fiche->fresh()->load('objectifs'));
    }

    /** PUT /api/eval/fiches/{id}/signer-evaluateur — Signature évaluateur (CDC §7.3) */
    public function signerEvaluateur(Request $request, EvalFiche $fiche): JsonResponse
    {
        if ($fiche->statut !== 'en_cours') {
            return response()->json(['message' => 'La fiche doit être en cours de notation avant signature.'], 422);
        }
        if ($fiche->moyenne === null) {
            return response()->json(['message' => 'Veuillez noter tous les critères avant de signer.'], 422);
        }

        $fiche->update([
            'statut'               => 'signee_evaluateur',
            'signe_evaluateur_at'  => now(),
            'observations_evaluateur' => $request->input('observations_evaluateur', $fiche->observations_evaluateur),
        ]);

        $fiche->audit($request->user()?->id, 'fiche.signer_evaluateur');

        return response()->json($fiche->fresh()->load(['employee', 'evaluateur:id,name']));
    }

    /** PUT /api/eval/fiches/{id}/signer-agent — Signature agent ou consignation refus (CDC §7.3) */
    public function signerAgent(Request $request, EvalFiche $fiche): JsonResponse
    {
        if ($fiche->statut !== 'signee_evaluateur') {
            return response()->json(['message' => 'La fiche doit être signée par l\'évaluateur en premier.'], 422);
        }

        $data = $request->validate([
            'observations_agent'    => 'nullable|string',
            'refus_signature'       => 'nullable|boolean',
            'motif_refus_signature' => 'nullable|string|max:500',
        ]);

        $fiche->update([
            'statut'                => 'signee_agent',
            'signe_agent_at'        => now(),
            'observations_agent'    => $data['observations_agent'] ?? $fiche->observations_agent,
            'refus_signature_agent' => $data['refus_signature'] ?? false,
            'motif_refus_signature' => $data['motif_refus_signature'] ?? null,
        ]);

        $fiche->audit($request->user()?->id, 'fiche.signer_agent', [
            'refus' => $data['refus_signature'] ?? false,
        ]);

        return response()->json($fiche->fresh()->load(['employee', 'evaluateur:id,name']));
    }

    /** PUT /api/eval/fiches/{id}/transmettre-daf — Transmission DAF (CDC §7.4) */
    public function transmettreDAF(Request $request, EvalFiche $fiche): JsonResponse
    {
        if ($fiche->statut !== 'signee_agent') {
            return response()->json(['message' => 'La fiche doit être signée par les deux parties.'], 422);
        }

        $fiche->update([
            'statut'          => 'transmise_daf',
            'transmise_daf_at'=> now(),
            'daf_user_id'     => $request->user()?->id,
        ]);

        $fiche->audit($request->user()?->id, 'fiche.transmettre_daf');

        return response()->json($fiche->fresh()->load(['employee', 'evaluateur:id,name', 'dafUser:id,name']));
    }

    /** PUT /api/eval/fiches/{id}/annoter-dg — Annotation DG/SG + décisions RH (CDC §7.5) */
    public function annoterDG(Request $request, EvalFiche $fiche): JsonResponse
    {
        if (!in_array($fiche->statut, ['transmise_daf', 'annotee_dg'])) {
            return response()->json(['message' => 'La fiche doit être transmise au DAF.'], 422);
        }

        $data = $request->validate([
            'avis_dg'            => 'nullable|string',
            'decision'           => 'nullable|array',
            'decision.formation'        => 'nullable|boolean',
            'decision.coaching'         => 'nullable|boolean',
            'decision.mobilite'         => 'nullable|boolean',
            'decision.felicitations'    => 'nullable|boolean',
            'decision.suivi_particulier'=> 'nullable|boolean',
            'decision.gratification'    => 'nullable|boolean',
            'decision.montant_gratification' => 'nullable|string|max:100',
            'decision.autre'            => 'nullable|string|max:300',
            'decision.commentaire'      => 'nullable|string',
        ]);

        $fiche->update([
            'statut'     => 'annotee_dg',
            'avis_dg'    => $data['avis_dg'] ?? $fiche->avis_dg,
            'dg_user_id' => $request->user()?->id,
        ]);

        if (!empty($data['decision'])) {
            EvalDecisionRh::updateOrCreate(
                ['fiche_id' => $fiche->id],
                array_merge($data['decision'], [
                    'decideur_id' => $request->user()?->id,
                    'decide_at'   => now(),
                ])
            );
        }

        $fiche->audit($request->user()?->id, 'fiche.annoter_dg');

        return response()->json($fiche->fresh()->load(['employee', 'decisionRh', 'dgUser:id,name']));
    }

    /** PUT /api/eval/fiches/{id}/notifier — Notification agent (CDC §7.6) */
    public function notifier(Request $request, EvalFiche $fiche): JsonResponse
    {
        if (!in_array($fiche->statut, ['annotee_dg', 'transmise_daf'])) {
            return response()->json(['message' => 'La fiche doit être annotée par le DG avant notification.'], 422);
        }

        $fiche->update([
            'statut'      => 'notifiee',
            'notifiee_at' => now(),
        ]);

        $fiche->audit($request->user()?->id, 'fiche.notifier');

        // TODO : générer et envoyer le courrier de notification par email (phase ultérieure)

        return response()->json($fiche->fresh()->load(['employee', 'decisionRh']));
    }

    /** PUT /api/eval/fiches/{id}/archiver — Archivage définitif (CDC §7.6) */
    public function archiver(Request $request, EvalFiche $fiche): JsonResponse
    {
        if ($fiche->statut !== 'notifiee') {
            return response()->json(['message' => 'La fiche doit être notifiée avant archivage.'], 422);
        }

        $fiche->update([
            'statut'      => 'archivee',
            'archivee_at' => now(),
        ]);

        $fiche->audit($request->user()?->id, 'fiche.archiver');

        return response()->json(['message' => 'Fiche archivée avec succès.']);
    }

    /** DELETE /api/eval/fiches/{id} — supprime une fiche individuelle */
    public function destroy(EvalFiche $fiche): JsonResponse
    {
        $nom = $fiche->employee?->first_name . ' ' . $fiche->employee?->last_name;
        $fiche->delete();

        return response()->json([
            'message' => "Fiche de {$nom} supprimée.",
        ]);
    }

    /** GET /api/eval/criteres?statut_agent=contractuel|fonctionnaire|decisionnaire */
    public function criteres(Request $request): JsonResponse
    {
        $statut = $request->input('statut_agent', 'contractuel');
        return response()->json(EvalCritere::pourStatutAgent($statut));
    }
}
