<?php

namespace App\Http\Controllers\Api;

use App\Enums\EvalStatutFiche;
use App\Http\Controllers\Controller;
use App\Models\EvalAudit;
use App\Models\EvalBesoinFormation;
use App\Models\EvalFiche;
use App\Models\EvalNotation;
use App\Models\EvalObjectif;
use App\Services\Eval\EvalFicheService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class EvalFicheController extends Controller
{
    public function __construct(private EvalFicheService $ficheService) {}

    // ── Consultation ──────────────────────────────────────────────────────

    /**
     * GET /api/eval/fiches
     * Paramètres : campagne_id, statut, evaluateur_id, categorie_agent, mes_fiches=1
     */
    public function index(Request $request): JsonResponse
    {
        $query = EvalFiche::with([
            'employee:id,first_name,last_name,employee_number,department_id',
            'employee.department:id,name',
            'evaluateur:id,name',
            'campagne:id,exercice,titre,statut',
        ]);

        if ($request->boolean('mes_fiches')) {
            $query->where('evaluateur_id', $request->user()->id);
        }
        if ($request->filled('campagne_id')) {
            $query->where('campagne_id', $request->campagne_id);
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('evaluateur_id')) {
            $query->where('evaluateur_id', $request->evaluateur_id);
        }
        if ($request->filled('categorie_agent')) {
            $query->where('categorie_agent', $request->categorie_agent);
        }
        if ($request->filled('direction')) {
            $query->where('snapshot_direction', $request->direction);
        }
        if ($request->filled('service')) {
            $query->where('snapshot_service', $request->service);
        }

        return response()->json(
            $query->orderByDesc('updated_at')
                ->get()
                ->map(fn(EvalFiche $f) => array_merge($f->toArray(), [
                    'statut_libelle'  => $f->statut->libelle(),
                    'sous_procedure'  => $f->statut->sousProcedure(),
                ]))
        );
    }

    /**
     * GET /api/eval/fiches/{fiche}
     * Inclut les critères applicables, le flag is_readonly et les transitions disponibles.
     */
    public function show(EvalFiche $fiche): JsonResponse
    {
        $fiche->load([
            'employee',
            'employee.department',
            'evaluateur:id,name',
            'campagne:id,exercice,titre,statut,periode_debut,periode_fin,referentiel_id',
            'campagne.referentiel',
            'notations.critere',
            'besoinsFormation',
            'objectifs',
            'decisionRh',
            'historiqueStatuts',
        ]);

        $criteres = $fiche->campagne?->referentiel
            ?->criteresParCategorie($fiche->categorie_agent);

        // Lecture seule dès que la fiche est transmise au DAF (SP4+)
        $ordreVie        = EvalStatutFiche::ordreCycleVie();
        $idxDaf          = array_search(EvalStatutFiche::TransmiseDaf, $ordreVie);
        $idxActuel       = array_search($fiche->statut, $ordreVie);
        $isReadonly      = $idxActuel !== false && $idxDaf !== false && $idxActuel >= $idxDaf;

        return response()->json([
            'fiche'          => $fiche,
            'criteres'       => $criteres,
            'statut_libelle' => $fiche->statut->libelle(),
            'sous_procedure' => $fiche->statut->sousProcedure(),
            'transitions'    => $fiche->statut->transitionsAutorisees(),
            'is_readonly'    => $isReadonly,
        ]);
    }

    /**
     * GET /api/eval/fiches/tableau-bord — Tableau de bord du responsable connecté.
     * Route statique — DOIT rester avant /{fiche} dans api.php.
     */
    public function tableauBord(Request $request): JsonResponse
    {
        return response()->json(
            $this->ficheService->tableauBordResponsable(
                $request->user(),
                $request->integer('campagne_id') ?: null,
            )
        );
    }

    /**
     * GET /api/eval/fiches/{fiche}/criteres
     * Retourne les critères applicables à cet agent avec ses notes actuelles.
     * 4a — affichage conditionnel critères complémentaires (§4.1.2).
     */
    public function criteres(EvalFiche $fiche): JsonResponse
    {
        $referentiel = $fiche->campagne?->referentiel;

        if (! $referentiel) {
            return response()->json(['message' => 'Aucun référentiel associé à cette campagne.'], 422);
        }

        $criteres = $referentiel->criteresParCategorie($fiche->categorie_agent);

        // Fusion avec les notes déjà saisies
        $notations = $fiche->notations()->get()->keyBy('critere_id');

        $criteres = $criteres->map(fn($c) => array_merge($c->toArray(), [
            'note'        => $notations->get($c->id)?->note,
            'observation' => $notations->get($c->id)?->observation,
            'note_min'    => $referentiel->note_min,
            'note_max'    => $referentiel->note_max,
        ]));

        return response()->json([
            'criteres'     => $criteres,
            'categorie'    => $fiche->categorie_agent,
            'note_min'     => $referentiel->note_min,
            'note_max'     => $referentiel->note_max,
            'nb_socles'    => $criteres->where('type', 'socle')->count(),
            'nb_complementaires' => $criteres->where('type', 'complementaire')->count(),
            'taux_completion' => $criteres->count() > 0
                ? round($notations->whereNotNull('note')->count() / $criteres->count() * 100)
                : 0,
        ]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────

    /** POST /api/eval/fiches — Créer une fiche individuelle. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'campagne_id'    => 'required|integer|exists:eval_campagnes,id',
            'employee_id'    => 'required|integer|exists:employees,id',
            'evaluateur_id'  => 'nullable|integer|exists:users,id',
            'categorie_agent'=> 'nullable|in:contractuel,mis_a_disposition,decisionnaire',
        ]);

        if (EvalFiche::where('campagne_id', $data['campagne_id'])
            ->where('employee_id', $data['employee_id'])->exists()) {
            return response()->json(['message' => 'Une fiche existe déjà pour cet agent dans cette campagne.'], 422);
        }

        $employee   = \App\Models\Employee::with(['department', 'position', 'organisationUnit'])->findOrFail($data['employee_id']);
        $anciennete = $employee->hire_date
            ? (int) \Illuminate\Support\Carbon::parse($employee->hire_date)->diffInMonths(now())
            : null;

        $fiche = EvalFiche::create([
            'campagne_id'              => $data['campagne_id'],
            'employee_id'              => $data['employee_id'],
            'evaluateur_id'            => $data['evaluateur_id'] ?? null,
            'statut'                   => EvalStatutFiche::Cree->value,
            'categorie_agent'          => $data['categorie_agent'] ?? 'contractuel',
            'snapshot_matricule'       => $employee->employee_number,
            'snapshot_nom_complet'     => trim("{$employee->first_name} {$employee->last_name}"),
            'snapshot_direction'       => $employee->department?->name,
            'snapshot_service'         => $employee->organisationUnit?->libelle,
            'snapshot_fonction'        => $employee->fonction ?? $employee->position?->title,
            'snapshot_anciennete_mois' => $anciennete,
        ]);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'fiche.creer',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);

        return response()->json($fiche->load(['employee', 'evaluateur:id,name']), 201);
    }

    /**
     * POST /api/eval/fiches/creer-lot
     * Crée des fiches pour une liste d'agents (par sélection, direction ou service).
     * Les doublons (fiche déjà existante pour cet agent+campagne) sont ignorés.
     */
    public function creerLot(Request $request): JsonResponse
    {
        $data = $request->validate([
            'campagne_id'      => 'required|integer|exists:eval_campagnes,id',
            'employee_ids'     => 'required|array|min:1',
            'employee_ids.*'   => 'integer|exists:employees,id',
            'evaluateur_id'    => 'nullable|integer|exists:users,id',
            'categorie_agent'  => 'nullable|in:contractuel,mis_a_disposition,decisionnaire',
        ]);

        $existants = EvalFiche::where('campagne_id', $data['campagne_id'])
            ->whereIn('employee_id', $data['employee_ids'])
            ->pluck('employee_id')
            ->toArray();

        $aCreer = array_diff($data['employee_ids'], $existants);
        $crees  = 0;

        foreach ($aCreer as $employeeId) {
            $employee   = \App\Models\Employee::with(['department', 'position', 'organisationUnit'])->find($employeeId);
            if (! $employee) {
                continue;
            }
            $anciennete = $employee->hire_date
                ? (int) \Illuminate\Support\Carbon::parse($employee->hire_date)->diffInMonths(now())
                : null;

            $fiche = EvalFiche::create([
                'campagne_id'              => $data['campagne_id'],
                'employee_id'              => $employeeId,
                'evaluateur_id'            => $data['evaluateur_id'] ?? null,
                'statut'                   => EvalStatutFiche::Cree->value,
                'categorie_agent'          => $data['categorie_agent'] ?? 'contractuel',
                'snapshot_matricule'       => $employee->employee_number,
                'snapshot_nom_complet'     => trim("{$employee->first_name} {$employee->last_name}"),
                'snapshot_direction'       => $employee->department?->name,
                'snapshot_service'         => $employee->organisationUnit?->libelle,
                'snapshot_fonction'        => $employee->fonction ?? $employee->position?->title,
                'snapshot_anciennete_mois' => $anciennete,
            ]);

            EvalAudit::create([
                'user_id'     => $request->user()->id,
                'action'      => 'fiche.creer',
                'entite_type' => 'EvalFiche',
                'entite_id'   => $fiche->id,
            ]);

            $crees++;
        }

        return response()->json([
            'crees'           => $crees,
            'deja_existants'  => count($existants),
            'message'         => "{$crees} fiche(s) créée(s)." . (count($existants) ? ' ' . count($existants) . ' déjà existante(s) ignorée(s).' : ''),
        ], 201);
    }

    // ── SP2 — Planification des entretiens (§7.2) ─────────────────────────

    /** PUT /api/eval/fiches/{fiche}/planifier */
    public function planifier(Request $request, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'date_entretien'  => 'required|date|after_or_equal:today',
            'heure_entretien' => 'nullable|date_format:H:i',
            'lieu_entretien'  => 'nullable|string|max:200',
            'type_entretien'  => 'nullable|in:presentiel,visioconference',
        ]);

        try {
            $fiche = $this->ficheService->planifier($fiche, $data, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => "Entretien planifié. L'agent a été convoqué et notifié.",
            'fiche'   => $fiche->load(['employee', 'evaluateur:id,name', 'campagne:id,exercice,titre']),
        ]);
    }

    /** POST /api/eval/fiches/planifier-lot */
    public function planifierLot(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fiche_ids'       => 'required|array|min:1',
            'fiche_ids.*'     => 'integer|exists:eval_fiches,id',
            'date_entretien'  => 'required|date|after_or_equal:today',
            'heure_entretien' => 'nullable|date_format:H:i',
            'lieu_entretien'  => 'nullable|string|max:200',
            'type_entretien'  => 'nullable|in:presentiel,visioconference',
        ]);

        $resultat = $this->ficheService->planifierLot(
            $data['fiche_ids'],
            $data,
            $request->user(),
        );

        return response()->json([
            'message'    => "{$resultat['planifiees']} fiche(s) planifiée(s).",
            'planifiees' => $resultat['planifiees'],
            'erreurs'    => $resultat['erreurs'],
        ]);
    }

    /** POST /api/eval/fiches/{fiche}/replanifier */
    public function replanifier(Request $request, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'motif'                   => 'required|string|max:500',
            'nouvelle_date_entretien' => 'required|date|after_or_equal:today',
            'heure_entretien'         => 'nullable|date_format:H:i',
            'lieu_entretien'          => 'nullable|string|max:200',
            'type_entretien'          => 'nullable|in:presentiel,visioconference',
        ]);

        try {
            $fiche = $this->ficheService->replanifier($fiche, $data, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => "Entretien replanifié. L'agent a été notifié de la nouvelle date.",
            'fiche'   => $fiche->load(['employee', 'evaluateur:id,name']),
        ]);
    }

    /** POST /api/eval/fiches/{fiche}/accuser-consultation */
    public function accuserConsultation(Request $request, EvalFiche $fiche): JsonResponse
    {
        try {
            $fiche = $this->ficheService->accuserConsultation($fiche, $request->user());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'                => 'Réception accusée.',
            'convocation_accusee_at' => $fiche->convocation_accusee_at,
        ]);
    }

    // ── SP3 — 4a : Notation par critère (§7.3) ────────────────────────────

    /**
     * PUT /api/eval/fiches/{fiche}/noter
     * Saisie des notes avec validation dynamique contre note_min/note_max du référentiel.
     * Transition automatique agent_convoque → en_cours_notation.
     */
    public function noter(Request $request, EvalFiche $fiche): JsonResponse
    {
        // Validation dynamique de l'échelle de notes (§4.1)
        $referentiel = $fiche->campagne?->referentiel;
        $noteMin     = $referentiel?->note_min ?? 1;
        $noteMax     = $referentiel?->note_max ?? 5;

        $data = $request->validate([
            'notations'               => 'required|array|min:1',
            'notations.*.critere_id'  => 'required|integer|exists:eval_criteres,id',
            'notations.*.note'        => "required|integer|min:{$noteMin}|max:{$noteMax}",
            'notations.*.observation' => 'nullable|string|max:1000',
            'realisations'            => 'nullable|string',
            'difficultes'             => 'nullable|string',
            'competences_demontrees'  => 'nullable|string',
            'observations_evaluateur' => 'nullable|string',
            'entretien_tenu'          => 'nullable|boolean',
        ]);

        $statutsNot = [EvalStatutFiche::AgentConvoque, EvalStatutFiche::EnCoursNotation];

        if (! in_array($fiche->statut, $statutsNot, true)) {
            return response()->json([
                'message' => "La notation n'est possible qu'après convocation de l'agent (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        // Vérification que les critères soumis appartiennent au référentiel de la fiche
        $criteresApplicables = $referentiel
            ?->criteresParCategorie($fiche->categorie_agent)
            ->pluck('id')
            ->toArray() ?? [];

        foreach ($data['notations'] as $n) {
            if ($criteresApplicables && ! in_array($n['critere_id'], $criteresApplicables)) {
                return response()->json([
                    'message' => "Le critère #{$n['critere_id']} n'est pas applicable à cet agent.",
                ], 422);
            }
        }

        // Transition automatique si convoqué mais pas encore en cours
        if ($fiche->statut === EvalStatutFiche::AgentConvoque) {
            $fiche->transitionnerVers(
                EvalStatutFiche::EnCoursNotation,
                $request->user(),
                'Entretien tenu — ouverture de la notation'
            );
        }

        foreach ($data['notations'] as $n) {
            EvalNotation::updateOrCreate(
                ['fiche_id' => $fiche->id, 'critere_id' => $n['critere_id']],
                ['note' => $n['note'], 'observation' => $n['observation'] ?? null]
            );
        }

        $updates = array_filter([
            'realisations'            => $data['realisations'] ?? null,
            'difficultes'             => $data['difficultes'] ?? null,
            'competences_demontrees'  => $data['competences_demontrees'] ?? null,
            'observations_evaluateur' => $data['observations_evaluateur'] ?? null,
        ], fn($v) => $v !== null);

        if (isset($data['entretien_tenu'])) {
            $updates['entretien_tenu']    = $data['entretien_tenu'];
            $updates['entretien_tenu_at'] = $data['entretien_tenu'] && ! $fiche->entretien_tenu_at
                ? now()
                : $fiche->entretien_tenu_at;
        }

        if ($updates) {
            $fiche->update($updates);
        }

        $fiche->recalculerMoyenne();
        $fiche->audit($request->user()->id, 'fiche.noter', [
            'nb_criteres' => count($data['notations']),
        ]);

        return response()->json($fiche->fresh()->load(['notations.critere', 'employee', 'evaluateur:id,name']));
    }

    // ── SP3 — 4b : Blocs narratifs du bilan (§7.3) ────────────────────────

    /**
     * PUT /api/eval/fiches/{fiche}/bilan
     * Sauvegarde des blocs narratifs : bilan plan d'action, réalisations,
     * difficultés, compétences, perspectives d'évolution.
     */
    public function sauvegarderBilan(Request $request, EvalFiche $fiche): JsonResponse
    {
        $statutsOk = [
            EvalStatutFiche::EnCoursNotation,
            EvalStatutFiche::NoteeDiscussion,
            EvalStatutFiche::AttenteSignatureAgent,
        ];

        if (! in_array($fiche->statut, $statutsOk, true)) {
            return response()->json([
                'message' => "Le bilan ne peut être modifié qu'en cours de notation (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        $data = $request->validate([
            'bilan_plan_action'       => 'nullable|string',
            'realisations'            => 'nullable|string',
            'difficultes'             => 'nullable|string',
            'competences_demontrees'  => 'nullable|string',
            'perspectives_evolution'  => 'nullable|string',
            'observations_evaluateur' => 'nullable|string',
        ]);

        $fiche->update(array_filter($data, fn($v) => $v !== null));

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'fiche.bilan.sauvegarder',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);

        return response()->json($fiche->fresh());
    }

    /** PUT /api/eval/fiches/{fiche}/besoins */
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

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'fiche.besoins.sauvegarder',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
            'meta'        => ['nb_besoins' => count($data['besoins'])],
        ]);

        return response()->json($fiche->fresh()->load('besoinsFormation'));
    }

    /** PUT /api/eval/fiches/{fiche}/objectifs */
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

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'fiche.objectifs.sauvegarder',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
            'meta'        => ['nb_objectifs' => count($data['objectifs'])],
        ]);

        return response()->json($fiche->fresh()->load('objectifs'));
    }

    // ── SP3 — 4c : Double signature électronique séquentielle (§7.3) ──────

    /**
     * PUT /api/eval/fiches/{fiche}/signer-evaluateur
     * 1er temps : évaluateur finalise et soumet pour signature agent.
     * Transitions : en_cours_notation → notee_attente_discussion → attente_signature_agent.
     */
    public function signerEvaluateur(Request $request, EvalFiche $fiche): JsonResponse
    {
        if ($fiche->statut !== EvalStatutFiche::EnCoursNotation) {
            return response()->json([
                'message' => "La fiche doit être en cours de notation (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        if (! $fiche->tousLesCriteresNotas()) {
            return response()->json([
                'message' => 'Tous les critères obligatoires doivent être notés avant signature.',
            ], 422);
        }

        $observations = $request->input('observations_evaluateur');
        if ($observations !== null) {
            $fiche->update(['observations_evaluateur' => $observations]);
        }

        $user = $request->user();

        // NoteeDiscussion = note finalisée (discussion passée)
        $fiche->transitionnerVers(EvalStatutFiche::NoteeDiscussion, $user, 'Notation finalisée par l\'évaluateur');
        // AttenteSignatureAgent = soumis pour signature de l'agent
        $fiche->transitionnerVers(EvalStatutFiche::AttenteSignatureAgent, $user, 'Soumis pour signature de l\'agent');

        return response()->json([
            'message' => "Fiche soumise pour signature de l'agent.",
            'fiche'   => $fiche->fresh()->load(['employee', 'evaluateur:id,name']),
        ]);
    }

    /**
     * PUT /api/eval/fiches/{fiche}/signer-agent
     * 2e temps : l'agent signe (ou consigne son refus — §6 cas d'exception).
     *
     * Flux normal  : attente_signature_agent → signee → transmise_daf (auto §7.3 4d)
     * Cas exception: attente_signature_agent → signature_refusee
     *
     * La transmission au DAF est automatique (§7.3 4d).
     */
    public function signerAgent(Request $request, EvalFiche $fiche): JsonResponse
    {
        if ($fiche->statut !== EvalStatutFiche::AttenteSignatureAgent) {
            return response()->json([
                'message' => "La fiche n'est pas en attente de signature de l'agent (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        $data = $request->validate([
            'observations_agent'    => 'nullable|string',
            'refus_signature'       => 'nullable|boolean',
            'motif_refus_signature' => 'required_if:refus_signature,true|nullable|string|max:500',
        ]);

        $user  = $request->user();
        $refus = $data['refus_signature'] ?? false;

        if ($data['observations_agent'] ?? null) {
            $fiche->update(['observations_agent' => $data['observations_agent']]);
        }

        // ── Cas d'exception : refus de signature (§6) ─────────────────────
        if ($refus) {
            $fiche->update([
                'refus_signature_agent' => true,
                'motif_refus_signature' => $data['motif_refus_signature'] ?? null,
            ]);

            $fiche->transitionnerVers(
                EvalStatutFiche::SignatureRefusee,
                $user,
                $data['motif_refus_signature'] ?? 'Refus de signature de l\'agent'
            );

            return response()->json([
                'message' => "Refus de signature enregistré. La fiche repasse en attente de traitement.",
                'fiche'   => $fiche->fresh()->load(['employee', 'evaluateur:id,name']),
            ]);
        }

        // ── Flux normal : signature + transmission automatique DAF (4d) ────
        DB::transaction(function () use ($fiche, $user) {
            $fiche->transitionnerVers(EvalStatutFiche::Signee, $user, 'Fiche signée par l\'agent');

            // 4d — Transmission automatique au DAF (§7.3 fin de SP3)
            $fiche->transitionnerVers(
                EvalStatutFiche::TransmiseDaf,
                $user,
                'Transmission automatique au DAF — double signature obtenue'
            );
        });

        return response()->json([
            'message' => "Fiche signée et transmise automatiquement au DAF.",
            'fiche'   => $fiche->fresh()->load(['employee', 'evaluateur:id,name']),
        ]);
    }

    // ── SP3 — 4c : PDF horodaté non modifiable (§7.3) ────────────────────

    /**
     * GET /api/eval/fiches/{fiche}/pdf
     * Génère la fiche d'évaluation en PDF.
     * Disponible dès le statut attente_signature_agent.
     * Document marqué "SIGNÉ — NON MODIFIABLE" si statut >= signee.
     */
    public function telechargerPdf(EvalFiche $fiche): Response
    {
        $statutsAutorise = [
            EvalStatutFiche::AttenteSignatureAgent,
            EvalStatutFiche::SignatureRefusee,
            EvalStatutFiche::Signee,
            EvalStatutFiche::TransmiseDaf,
            EvalStatutFiche::ReceptioneeDaf,
            EvalStatutFiche::IntegreeeSynthese,
            EvalStatutFiche::TableauTransmisDg,
            EvalStatutFiche::EtudieeeDg,
            EvalStatutFiche::AnoteeDg,
            EvalStatutFiche::ValideeNotification,
            EvalStatutFiche::CourrierEtabli,
            EvalStatutFiche::Notifiee,
            EvalStatutFiche::Archivee,
        ];

        if (! in_array($fiche->statut, $statutsAutorise, true)) {
            abort(403, 'La fiche doit être au moins soumise pour signature avant de pouvoir être téléchargée.');
        }

        $fiche->load([
            'employee.department',
            'evaluateur:id,name',
            'campagne:id,exercice,titre,periode_debut,periode_fin,referentiel_id',
            'campagne.referentiel',
            'notations.critere',
            'besoinsFormation',
            'objectifs',
            'decisionRh',
        ]);

        $criteres  = $fiche->campagne?->referentiel?->criteresParCategorie($fiche->categorie_agent);
        $notations = $fiche->notations->keyBy('critere_id');

        $estSigne  = in_array($fiche->statut, [
            EvalStatutFiche::Signee,
            EvalStatutFiche::TransmiseDaf,
            EvalStatutFiche::ReceptioneeDaf,
            EvalStatutFiche::IntegreeeSynthese,
            EvalStatutFiche::TableauTransmisDg,
            EvalStatutFiche::EtudieeeDg,
            EvalStatutFiche::AnoteeDg,
            EvalStatutFiche::ValideeNotification,
            EvalStatutFiche::CourrierEtabli,
            EvalStatutFiche::Notifiee,
            EvalStatutFiche::Archivee,
        ], true);

        $pdf = Pdf::loadView('eval.fiche_evaluation', [
            'fiche'     => $fiche,
            'criteres'  => $criteres,
            'notations' => $notations,
            'est_signe' => $estSigne,
            'referentiel' => $fiche->campagne?->referentiel,
        ])->setPaper('a4', 'portrait');

        $nom      = str_replace(' ', '_', $fiche->snapshot_nom_complet ?? 'agent');
        $exercice = $fiche->campagne?->exercice ?? 'N';
        $filename = "fiche_eval_{$nom}_{$exercice}.pdf";

        $pdf->output(); // force render before audit
        $fiche->audit(null, 'fiche.pdf.telecharger');

        return $pdf->download($filename);
    }

    // ── SP4 — Transmission DAF (§7.4) ─────────────────────────────────────

    /**
     * PUT /api/eval/fiches/{fiche}/transmettre-daf
     * Réception formelle par le DAF (AR).
     * La fiche arrive déjà en transmise_daf via l'auto-transmission SP3.
     * Cette action déclenche ReceptioneeDaf.
     */
    public function transmettreDAF(Request $request, EvalFiche $fiche): JsonResponse
    {
        if ($fiche->statut !== EvalStatutFiche::TransmiseDaf) {
            return response()->json([
                'message' => "La fiche doit être transmise au DAF (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        $fiche->update(['daf_user_id' => $request->user()->id]);
        $fiche->transitionnerVers(EvalStatutFiche::ReceptioneeDaf, $request->user(), 'Réception formelle par le DAF');

        return response()->json([
            'message' => 'Fiche réceptionnée par le DAF.',
            'fiche'   => $fiche->fresh()->load(['employee', 'dafUser:id,name']),
        ]);
    }

    // ── SP5 — Annotation DG (§7.5) ────────────────────────────────────────

    /** PUT /api/eval/fiches/{fiche}/annoter-dg */
    public function annoterDG(Request $request, EvalFiche $fiche): JsonResponse
    {
        $statutsEntree = [
            EvalStatutFiche::EtudieeeDg,
            EvalStatutFiche::AnoteeDg,
        ];

        if (! in_array($fiche->statut, $statutsEntree, true)) {
            return response()->json([
                'message' => "La fiche n'est pas dans une étape permettant l'annotation DG (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        $data = $request->validate([
            'observations_dg' => 'nullable|string',
        ]);

        $user = $request->user();
        $fiche->update([
            'observations_dg' => $data['observations_dg'] ?? $fiche->observations_dg,
            'dg_user_id'      => $user->id,
        ]);

        if ($fiche->statut === EvalStatutFiche::EtudieeeDg) {
            $fiche->transitionnerVers(EvalStatutFiche::AnoteeDg, $user, 'Annotée par la Direction Générale');
        }

        return response()->json([
            'message' => 'Annotations DG enregistrées.',
            'fiche'   => $fiche->fresh()->load(['employee', 'dgUser:id,name']),
        ]);
    }

    // ── SP6 — Notification et archivage (§7.6) ────────────────────────────

    /** PUT /api/eval/fiches/{fiche}/notifier */
    public function notifier(Request $request, EvalFiche $fiche): JsonResponse
    {
        $statutsNotif = [EvalStatutFiche::ValideeNotification, EvalStatutFiche::CourrierEtabli];

        if (! in_array($fiche->statut, $statutsNotif, true)) {
            return response()->json([
                'message' => "La fiche n'est pas en état de notification (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        $user = $request->user();

        if ($fiche->statut === EvalStatutFiche::ValideeNotification) {
            $fiche->transitionnerVers(EvalStatutFiche::CourrierEtabli, $user, 'Courrier de notification établi');
        }

        $fiche->transitionnerVers(EvalStatutFiche::Notifiee, $user, 'Notification transmise à l\'agent');

        return response()->json([
            'message' => 'Agent notifié.',
            'fiche'   => $fiche->fresh()->load(['employee']),
        ]);
    }

    /** PUT /api/eval/fiches/{fiche}/archiver */
    public function archiver(Request $request, EvalFiche $fiche): JsonResponse
    {
        if ($fiche->statut !== EvalStatutFiche::Notifiee) {
            return response()->json([
                'message' => "La fiche doit être notifiée avant archivage (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        $fiche->transitionnerVers(EvalStatutFiche::Archivee, $request->user(), 'Archivage définitif');

        return response()->json(['message' => "Fiche archivée ({$fiche->snapshot_nom_complet})."]);
    }

    // ── §8 — Cas particuliers ─────────────────────────────────────────────

    /**
     * PUT /api/eval/fiches/{fiche}/changer-evaluateur
     * Permet à un DAF/RH de changer l'évaluateur désigné (§8 — chefs de service évalués par DG/SG).
     * Uniquement avant le début de la notation.
     */
    public function changerEvaluateur(Request $request, EvalFiche $fiche): JsonResponse
    {
        $statutsAutorises = [
            EvalStatutFiche::Cree,
            EvalStatutFiche::TransmiseResponsable,
            EvalStatutFiche::EntretienPlanifie,
            EvalStatutFiche::AgentConvoque,
            EvalStatutFiche::EntretienReporte,
        ];

        if (! in_array($fiche->statut, $statutsAutorises, true)) {
            return response()->json([
                'message' => "L'évaluateur ne peut être changé qu'avant le début de la notation (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        $data = $request->validate([
            'evaluateur_id' => 'required|exists:users,id',
            'motif'         => 'nullable|string|max:500',
        ]);

        $ancienEvaluateur = $fiche->evaluateur_id;
        $fiche->update(['evaluateur_id' => $data['evaluateur_id']]);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'fiche.changer_evaluateur',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
            'meta'        => [
                'ancien_evaluateur_id' => $ancienEvaluateur,
                'nouvel_evaluateur_id' => $data['evaluateur_id'],
                'motif'                => $data['motif'] ?? null,
            ],
        ]);

        return response()->json([
            'message'    => 'Évaluateur mis à jour.',
            'fiche'      => $fiche->fresh()->load('evaluateur:id,name'),
        ]);
    }

    /**
     * PUT /api/eval/fiches/{fiche}/avis-chef-service
     * Chef de service ou DAF enregistre l'avis du chef de service sur la fiche (§8).
     */
    public function avisChefService(Request $request, EvalFiche $fiche): JsonResponse
    {
        $data = $request->validate([
            'avis_chef_service' => 'required|string|max:3000',
        ]);

        $fiche->update([
            'avis_chef_service' => $data['avis_chef_service'],
            'chef_service_id'   => $request->user()->id,
        ]);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'fiche.avis_chef_service',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
        ]);

        return response()->json([
            'message' => 'Avis du chef de service enregistré.',
            'fiche'   => $fiche->fresh()->load('chefService:id,name'),
        ]);
    }

    /**
     * PUT /api/eval/fiches/{fiche}/ref-fp
     * DAF rattache le justificatif de notation Fonction publique (§8 — ref_notation_fp).
     * Disponible une fois la fiche réceptionnée par le DAF.
     */
    public function refFp(Request $request, EvalFiche $fiche): JsonResponse
    {
        $statutsAutorises = [
            EvalStatutFiche::ReceptioneeDaf,
            EvalStatutFiche::IntegreeeSynthese,
            EvalStatutFiche::TableauTransmisDg,
            EvalStatutFiche::EtudieeeDg,
            EvalStatutFiche::AnoteeDg,
            EvalStatutFiche::ValideeNotification,
            EvalStatutFiche::CourrierEtabli,
            EvalStatutFiche::Notifiee,
        ];

        if (! in_array($fiche->statut, $statutsAutorises, true)) {
            return response()->json([
                'message' => "Le justificatif FP ne peut être rattaché qu'après réception par le DAF (statut actuel : {$fiche->statut->libelle()}).",
            ], 422);
        }

        $data = $request->validate([
            'ref_notation_fp' => 'required|string|max:500',
        ]);

        $fiche->update(['ref_notation_fp' => $data['ref_notation_fp']]);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'fiche.ref_fp',
            'entite_type' => 'EvalFiche',
            'entite_id'   => $fiche->id,
            'meta'        => ['ref' => $data['ref_notation_fp']],
        ]);

        return response()->json([
            'message'    => 'Référence de notation FP enregistrée.',
            'ref_notation_fp' => $fiche->fresh()->ref_notation_fp,
        ]);
    }

    /** DELETE /api/eval/fiches/{fiche} */
    public function destroy(EvalFiche $fiche): JsonResponse
    {
        $nom = $fiche->snapshot_nom_complet ?? 'Agent';
        $fiche->delete();

        return response()->json(['message' => "Fiche de {$nom} supprimée."]);
    }
}
