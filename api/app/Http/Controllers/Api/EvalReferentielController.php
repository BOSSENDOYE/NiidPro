<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvalAudit;
use App\Models\EvalCritere;
use App\Models\EvalReferentiel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvalReferentielController extends Controller
{
    /** GET /api/eval/referentiels */
    public function index(): JsonResponse
    {
        $referentiels = EvalReferentiel::with(['createur:id,name', 'verrouilleur:id,name'])
            ->withCount(['criteres', 'campagnes'])
            ->orderBy('code')
            ->orderByDesc('version')
            ->get()
            ->map(fn(EvalReferentiel $r) => array_merge($r->toArray(), [
                'nb_socles'          => $r->criteresSocles()->where('actif', true)->count(),
                'nb_complementaires' => $r->criteresComplementaires()->where('actif', true)->count(),
            ]));

        return response()->json($referentiels);
    }

    /** POST /api/eval/referentiels */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'    => 'required|string|max:40',
            'libelle' => 'required|string|max:200',
            'note_min' => 'nullable|integer|min:1|max:10',
            'note_max' => 'nullable|integer|min:1|max:20',
        ]);

        // Calcule la prochaine version pour ce code
        $derniereVersion = EvalReferentiel::where('code', $data['code'])->max('version') ?? 0;

        $ref = EvalReferentiel::create([
            'code'     => $data['code'],
            'version'  => $derniereVersion + 1,
            'libelle'  => $data['libelle'],
            'note_min' => $data['note_min'] ?? 1,
            'note_max' => $data['note_max'] ?? 5,
            'cree_par' => $request->user()->id,
        ]);

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'referentiel.creer',
            'entite_type' => 'EvalReferentiel',
            'entite_id'   => $ref->id,
        ]);

        return response()->json($ref->load(['createur:id,name', 'criteres']), 201);
    }

    /**
     * POST /api/eval/referentiels/seed
     * Crée un référentiel pré-rempli avec les 13 critères officiels du CDC §4.1.
     */
    public function seed(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'    => 'sometimes|string|max:40',
            'libelle' => 'sometimes|string|max:200',
        ]);

        $code    = $data['code'] ?? 'ANASER';
        $libelle = $data['libelle'] ?? "Référentiel d'évaluation ANASER";
        $version = (EvalReferentiel::where('code', $code)->max('version') ?? 0) + 1;

        $ref = EvalReferentiel::create([
            'code'     => $code,
            'version'  => $version,
            'libelle'  => $libelle,
            'note_min' => 1,
            'note_max' => 5,
            'cree_par' => $request->user()->id,
        ]);

        // Critères socles §4.1.1 (applicables à tout le personnel)
        $socles = [
            ['C01', 'Assiduité au travail et conduite'],
            ['C02', 'Ponctualité'],
            ['C03', 'Célérité dans l\'accomplissement des tâches'],
            ['C04', 'Esprit d\'initiative'],
            ['C05', 'Sens des responsabilités'],
            ['C06', 'Relations humaines'],
            ['C07', 'Engagement dans les projets, programmes et activités de l\'ANASER'],
        ];

        // Critères complémentaires §4.1.2 (agents mis à disposition par l'État)
        $complementaires = [
            ['C08', 'Conscience professionnelle'],
            ['C09', 'Bonne conduite'],
            ['C10', 'Respect du secret professionnel'],
            ['C11', 'Tâches dévolues à l\'agent'],
            ['C12', 'Sens de l\'engagement'],
            ['C13', 'Respect de l\'autorité et de la hiérarchie'],
        ];

        foreach ($socles as $i => [$code2, $libelle2]) {
            EvalCritere::create([
                'referentiel_id' => $ref->id,
                'code'           => $code2,
                'libelle'        => $libelle2,
                'type'           => 'socle',
                'ordre'          => $i + 1,
                'actif'          => true,
            ]);
        }

        foreach ($complementaires as $i => [$code2, $libelle2]) {
            EvalCritere::create([
                'referentiel_id' => $ref->id,
                'code'           => $code2,
                'libelle'        => $libelle2,
                'type'           => 'complementaire',
                'ordre'          => count($socles) + $i + 1,
                'actif'          => true,
            ]);
        }

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'referentiel.seed',
            'entite_type' => 'EvalReferentiel',
            'entite_id'   => $ref->id,
            'meta'        => ['code' => $code, 'version' => $version],
        ]);

        return response()->json($ref->load('criteres'), 201);
    }

    /** GET /api/eval/referentiels/{referentiel} */
    public function show(EvalReferentiel $referentiel): JsonResponse
    {
        return response()->json([
            'referentiel' => $referentiel->load(['createur:id,name', 'verrouilleur:id,name']),
            'criteres'    => $referentiel->criteres()->orderBy('type')->orderBy('ordre')->get(),
            'campagnes'   => $referentiel->campagnes()->select('id', 'exercice', 'titre', 'statut')->get(),
        ]);
    }

    /** PUT /api/eval/referentiels/{referentiel} */
    public function update(Request $request, EvalReferentiel $referentiel): JsonResponse
    {
        if ($referentiel->verrouille) {
            return response()->json([
                'message' => 'Ce référentiel est verrouillé (campagne en cours). Créez une nouvelle version pour le modifier.',
            ], 422);
        }

        $data = $request->validate([
            'libelle'  => 'sometimes|string|max:200',
            'note_min' => 'sometimes|integer|min:1|max:10',
            'note_max' => 'sometimes|integer|min:1|max:20',
        ]);

        $referentiel->update($data);

        return response()->json($referentiel->fresh()->load('createur:id,name'));
    }

    /**
     * PUT /api/eval/referentiels/{referentiel}/criteres
     * Remplace en bloc les critères du référentiel (si non verrouillé).
     */
    public function storeCriteres(Request $request, EvalReferentiel $referentiel): JsonResponse
    {
        if ($referentiel->verrouille) {
            return response()->json([
                'message' => 'Référentiel verrouillé — modification des critères impossible.',
            ], 422);
        }

        $data = $request->validate([
            'criteres'              => 'required|array|min:1',
            'criteres.*.code'       => 'required|string|max:20',
            'criteres.*.libelle'    => 'required|string|max:300',
            'criteres.*.type'       => 'required|in:socle,complementaire',
            'criteres.*.ordre'      => 'nullable|integer',
            'criteres.*.actif'      => 'nullable|boolean',
        ]);

        // Supprime les anciens critères et recrée (référentiel non verrouillé)
        $referentiel->criteres()->delete();

        foreach ($data['criteres'] as $i => $c) {
            EvalCritere::create([
                'referentiel_id' => $referentiel->id,
                'code'           => $c['code'],
                'libelle'        => $c['libelle'],
                'type'           => $c['type'],
                'ordre'          => $c['ordre'] ?? ($i + 1),
                'actif'          => $c['actif'] ?? true,
            ]);
        }

        EvalAudit::create([
            'user_id'     => $request->user()->id,
            'action'      => 'referentiel.criteres.modifier',
            'entite_type' => 'EvalReferentiel',
            'entite_id'   => $referentiel->id,
            'meta'        => ['nb_criteres' => count($data['criteres'])],
        ]);

        return response()->json([
            'message'  => count($data['criteres']) . ' critère(s) enregistré(s).',
            'criteres' => $referentiel->criteres()->orderBy('type')->orderBy('ordre')->get(),
        ]);
    }

    /** DELETE /api/eval/referentiels/{referentiel} */
    public function destroy(EvalReferentiel $referentiel): JsonResponse
    {
        if ($referentiel->verrouille) {
            return response()->json(['message' => 'Référentiel verrouillé — suppression impossible.'], 422);
        }

        if ($referentiel->campagnes()->exists()) {
            return response()->json(['message' => 'Ce référentiel est utilisé par une ou plusieurs campagnes.'], 422);
        }

        $referentiel->delete();

        return response()->json(['message' => 'Référentiel supprimé.']);
    }
}
