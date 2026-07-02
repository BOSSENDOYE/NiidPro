<?php

namespace App\Http\Controllers\Api;

use App\Models\RecruitmentIndice;
use App\Models\RecruitmentHierarchy;
use App\Models\RecruitmentAugmentation;
use App\Models\RecruitmentBareme;
use App\Models\PaieClasse;
use App\Models\PaieEchelon;
use App\Models\PayrollCotisation;
use App\Models\PayrollAutreRubrique;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class RecruitmentParamsController
{
    // ═══════════════════════════════════════════════════════
    //  INDICES
    // ═══════════════════════════════════════════════════════

    public function indices(): JsonResponse
    {
        return response()->json(
            RecruitmentIndice::with(['hierarchy', 'augmentations'])->orderBy('valeur')->get()
        );
    }

    public function storeIndice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'              => ['required', 'string', 'max:50', 'unique:recruitment_indices,code'],
            'hierarchy_id'      => ['nullable', 'exists:recruitment_hierarchies,id'],
            'classe'            => ['nullable', 'string', 'max:50'],
            'echelon_label'     => ['nullable', 'string', 'max:50'],
            'valeur_point'      => ['nullable', 'numeric', 'min:0'],
            'valeur'            => ['required', 'integer', 'min:1'],
            'solde_mensuelle'   => ['nullable', 'numeric', 'min:0'],
            'garde'             => ['nullable', 'string', 'max:100'],
            'description'       => ['nullable', 'string', 'max:255'],
            'is_active'         => ['boolean'],
            'augmentation_ids'  => ['nullable', 'array'],
            'augmentation_ids.*'=> ['exists:recruitment_augmentations,id'],
            'augmentation_montants'   => ['nullable', 'array'],
            'augmentation_montants.*' => ['nullable', 'numeric', 'min:0'],
        ]);

        $augIds      = $validated['augmentation_ids'] ?? [];
        $augMontants = $validated['augmentation_montants'] ?? [];
        unset($validated['augmentation_ids'], $validated['augmentation_montants']);

        $indice = RecruitmentIndice::create($validated);
        if ($augIds) {
            $syncData = [];
            foreach ($augIds as $id) {
                $syncData[$id] = ['montant' => isset($augMontants[$id]) ? (float) $augMontants[$id] : null];
            }
            $indice->augmentations()->sync($syncData);
        }

        return response()->json($indice->load(['hierarchy', 'augmentations']), 201);
    }

    public function updateIndice(Request $request, RecruitmentIndice $indice): JsonResponse
    {
        $validated = $request->validate([
            'code'              => ['sometimes', 'string', 'max:50', 'unique:recruitment_indices,code,' . $indice->id],
            'hierarchy_id'      => ['nullable', 'exists:recruitment_hierarchies,id'],
            'classe'            => ['nullable', 'string', 'max:50'],
            'echelon_label'     => ['nullable', 'string', 'max:50'],
            'valeur_point'      => ['nullable', 'numeric', 'min:0'],
            'valeur'            => ['sometimes', 'integer', 'min:1'],
            'solde_mensuelle'   => ['nullable', 'numeric', 'min:0'],
            'garde'             => ['nullable', 'string', 'max:100'],
            'description'       => ['nullable', 'string', 'max:255'],
            'is_active'         => ['boolean'],
            'augmentation_ids'  => ['nullable', 'array'],
            'augmentation_ids.*'=> ['exists:recruitment_augmentations,id'],
            'augmentation_montants'   => ['nullable', 'array'],
            'augmentation_montants.*' => ['nullable', 'numeric', 'min:0'],
        ]);

        $augIds      = $validated['augmentation_ids'] ?? null;
        $augMontants = $validated['augmentation_montants'] ?? [];
        unset($validated['augmentation_ids'], $validated['augmentation_montants']);

        $indice->update($validated);

        if ($augIds !== null) {
            $syncData = [];
            foreach ($augIds as $id) {
                $syncData[$id] = ['montant' => isset($augMontants[$id]) ? (float) $augMontants[$id] : null];
            }
            $indice->augmentations()->sync($syncData);
        }

        return response()->json($indice->load(['hierarchy', 'augmentations']));
    }

    public function destroyIndice(RecruitmentIndice $indice): JsonResponse
    {
        $indice->delete();

        return response()->json(null, 204);
    }

    // ═══════════════════════════════════════════════════════
    //  HIÉRARCHIES
    // ═══════════════════════════════════════════════════════

    public function hierarchies(): JsonResponse
    {
        return response()->json(
            RecruitmentHierarchy::orderBy('ordre')->get()
        );
    }

    public function storeHierarchy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'        => ['required', 'string', 'max:50', 'unique:recruitment_hierarchies,code'],
            'libelle'     => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'ordre'       => ['integer', 'min:0'],
            'is_active'   => ['boolean'],
        ]);

        return response()->json(RecruitmentHierarchy::create($validated), 201);
    }

    public function updateHierarchy(Request $request, RecruitmentHierarchy $hierarchy): JsonResponse
    {
        $validated = $request->validate([
            'code'        => ['sometimes', 'string', 'max:50', 'unique:recruitment_hierarchies,code,' . $hierarchy->id],
            'libelle'     => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'ordre'       => ['integer', 'min:0'],
            'is_active'   => ['boolean'],
        ]);

        $hierarchy->update($validated);

        return response()->json($hierarchy);
    }

    public function destroyHierarchy(RecruitmentHierarchy $hierarchy): JsonResponse
    {
        $hierarchy->delete();

        return response()->json(null, 204);
    }

    // ═══════════════════════════════════════════════════════
    //  AUGMENTATIONS
    // ═══════════════════════════════════════════════════════

    public function augmentations(): JsonResponse
    {
        return response()->json(
            RecruitmentAugmentation::orderBy('date_effet', 'desc')->get()
        );
    }

    public function storeAugmentation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'libelle'     => ['required', 'string', 'max:255'],
            'type'        => ['required', 'string', 'max:50'],
            'taux'        => ['nullable', 'numeric', 'min:0'],
            'unite'       => ['nullable', 'in:pourcentage,montant'],
            'date_effet'  => ['nullable', 'date'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['boolean'],
        ]);

        return response()->json(RecruitmentAugmentation::create($validated), 201);
    }

    public function updateAugmentation(Request $request, RecruitmentAugmentation $augmentation): JsonResponse
    {
        $validated = $request->validate([
            'libelle'     => ['sometimes', 'string', 'max:255'],
            'type'        => ['sometimes', 'string', 'max:50'],
            'taux'        => ['nullable', 'numeric', 'min:0'],
            'unite'       => ['nullable', 'in:pourcentage,montant'],
            'date_effet'  => ['nullable', 'date'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['boolean'],
        ]);

        $augmentation->update($validated);

        return response()->json($augmentation);
    }

    public function destroyAugmentation(RecruitmentAugmentation $augmentation): JsonResponse
    {
        $augmentation->delete();

        return response()->json(null, 204);
    }

    // ═══════════════════════════════════════════════════════
    //  BARÈMES
    // ═══════════════════════════════════════════════════════

    public function baremes(Request $request): JsonResponse
    {
        $query = RecruitmentBareme::with(['hierarchy', 'indice']);

        if ($request->filled('hierarchy_id')) {
            $query->where('hierarchy_id', $request->get('hierarchy_id'));
        }

        return response()->json(
            $query->orderBy('hierarchy_id')->orderBy('echelon')->get()
        );
    }

    public function storeBareme(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hierarchy_id'     => ['nullable', 'exists:recruitment_hierarchies,id'],
            'indice_id'        => ['nullable', 'exists:recruitment_indices,id'],
            'echelon'          => ['nullable', 'integer', 'min:1'],
            'salaire_base'     => ['nullable', 'numeric', 'min:0'],
            'date_application' => ['nullable', 'date'],
            'is_active'        => ['boolean'],
            'revenu_brut'      => ['nullable', 'numeric', 'min:0'],
            'trimf_pers'       => ['nullable', 'numeric', 'min:0'],
            'part_1'           => ['nullable', 'numeric', 'min:0'],
            'part_1_5'         => ['nullable', 'numeric', 'min:0'],
            'part_2'           => ['nullable', 'numeric', 'min:0'],
            'part_2_5'         => ['nullable', 'numeric', 'min:0'],
            'part_3'           => ['nullable', 'numeric', 'min:0'],
            'part_3_5'         => ['nullable', 'numeric', 'min:0'],
            'part_4'           => ['nullable', 'numeric', 'min:0'],
            'part_4_5'         => ['nullable', 'numeric', 'min:0'],
            'part_5'           => ['nullable', 'numeric', 'min:0'],
            'id_bareme'        => ['nullable', 'string', 'max:30'],
        ]);

        if (empty($validated['id_bareme'])) {
            $validated['id_bareme'] = now()->format('YmdHisu');
        }
        if (empty($validated['salaire_base']) && isset($validated['revenu_brut'])) {
            $validated['salaire_base'] = $validated['revenu_brut'];
        }

        $bareme = RecruitmentBareme::create($validated);

        return response()->json($bareme->load('hierarchy', 'indice'), 201);
    }

    public function updateBareme(Request $request, RecruitmentBareme $bareme): JsonResponse
    {
        $validated = $request->validate([
            'hierarchy_id'     => ['nullable', 'exists:recruitment_hierarchies,id'],
            'indice_id'        => ['nullable', 'exists:recruitment_indices,id'],
            'echelon'          => ['nullable', 'integer', 'min:1'],
            'salaire_base'     => ['nullable', 'numeric', 'min:0'],
            'date_application' => ['nullable', 'date'],
            'is_active'        => ['boolean'],
            'revenu_brut'      => ['nullable', 'numeric', 'min:0'],
            'trimf_pers'       => ['nullable', 'numeric', 'min:0'],
            'part_1'           => ['nullable', 'numeric', 'min:0'],
            'part_1_5'         => ['nullable', 'numeric', 'min:0'],
            'part_2'           => ['nullable', 'numeric', 'min:0'],
            'part_2_5'         => ['nullable', 'numeric', 'min:0'],
            'part_3'           => ['nullable', 'numeric', 'min:0'],
            'part_3_5'         => ['nullable', 'numeric', 'min:0'],
            'part_4'           => ['nullable', 'numeric', 'min:0'],
            'part_4_5'         => ['nullable', 'numeric', 'min:0'],
            'part_5'           => ['nullable', 'numeric', 'min:0'],
            'id_bareme'        => ['nullable', 'string', 'max:30'],
        ]);

        if (isset($validated['revenu_brut'])) {
            $validated['salaire_base'] = $validated['revenu_brut'];
        }

        $bareme->update($validated);

        return response()->json($bareme->load('hierarchy', 'indice'));
    }

    public function destroyBareme(RecruitmentBareme $bareme): JsonResponse
    {
        $bareme->delete();

        return response()->json(null, 204);
    }

    public function importIndices(Request $request): JsonResponse
    {
        $request->validate([
            'rows'                   => ['required', 'array', 'min:1', 'max:3000'],
            'rows.*'                 => ['array'],
            'rows.*.hierarchy_code'  => ['required', 'string'],
            'rows.*.valeur'          => ['required', 'numeric', 'min:0'],
            'rows.*.augmentations'   => ['nullable', 'array'],
            'rows.*.augmentations.*' => ['nullable', 'numeric', 'min:0'],
        ]);

        $hierMap = RecruitmentHierarchy::pluck('id', 'code')->all();

        $now           = now();
        $indiceRows    = [];
        $augDataByCode = [];
        $allAugLibels  = [];
        $skipped       = 0;

        foreach ($request->input('rows') as $row) {
            $hCode  = strtoupper(trim($row['hierarchy_code'] ?? ''));
            $hierId = $hierMap[$hCode] ?? null;

            if (!$hierId) { $skipped++; continue; }

            $valeur      = (float)($row['valeur']       ?? 0);
            $valeurPoint = (float)($row['valeur_point'] ?? 0);
            $solde       = $valeurPoint > 0 && $valeur > 0
                           ? round($valeurPoint * $valeur, 2)
                           : (float)($row['solde_mensuelle'] ?? 0);

            $classe       = trim($row['classe']        ?? '');
            $echelonLabel = trim($row['echelon_label'] ?? '');
            $garde        = trim($row['garde']         ?? '');

            $codeParts = array_filter([$hCode, $classe, $echelonLabel, (string)(int)$valeur]);
            $code      = implode('_', $codeParts);

            $indiceRows[] = [
                'code'            => $code,
                'hierarchy_id'    => $hierId,
                'classe'          => $classe ?: null,
                'echelon_label'   => $echelonLabel ?: null,
                'garde'           => $garde ?: null,
                'valeur'          => (int)$valeur,
                'valeur_point'    => $valeurPoint ?: null,
                'solde_mensuelle' => $solde ?: null,
                'is_active'       => true,
                'description'     => null,
                'created_at'      => $now,
                'updated_at'      => $now,
            ];

            $augs = $row['augmentations'] ?? [];
            if (!empty($augs)) {
                $augDataByCode[$code] = [];
                foreach ($augs as $libelle => $montant) {
                    $libelle = trim((string)$libelle);
                    $montant = (float)$montant;
                    if ($libelle && $montant > 0) {
                        $augDataByCode[$code][$libelle] = $montant;
                        $allAugLibels[$libelle]         = true;
                    }
                }
            }
        }

        // Upsert des indices
        foreach (array_chunk($indiceRows, 500) as $chunk) {
            RecruitmentIndice::upsert(
                $chunk,
                ['code'],
                ['hierarchy_id','classe','echelon_label','garde','valeur','valeur_point','solde_mensuelle','updated_at']
            );
        }

        // Upsert des augmentations + table pivot
        $codes       = array_column($indiceRows, 'code');
        $indiceIdMap = RecruitmentIndice::whereIn('code', $codes)->pluck('id', 'code')->all();

        if (!empty($augDataByCode)) {
            $augMap = [];
            foreach (array_keys($allAugLibels) as $libelle) {
                $aug = RecruitmentAugmentation::firstOrCreate(
                    ['libelle' => $libelle],
                    ['type' => 'indemnitaire', 'is_active' => true]
                );
                $augMap[$libelle] = $aug->id;
            }

            $pivotRows   = [];
            $affectedIds = [];
            foreach ($augDataByCode as $code => $augs) {
                $indiceId = $indiceIdMap[$code] ?? null;
                if (!$indiceId) continue;
                $affectedIds[] = $indiceId;
                foreach ($augs as $libelle => $montant) {
                    $augId = $augMap[$libelle] ?? null;
                    if (!$augId) continue;
                    $pivotRows[] = [
                        'indice_id'       => $indiceId,
                        'augmentation_id' => $augId,
                        'montant'         => $montant,
                    ];
                }
            }

            // Supprimer les anciennes lignes pivot pour ces indices (évite les doublons)
            if (!empty($affectedIds)) {
                DB::table('recruitment_indice_augmentation')
                    ->whereIn('indice_id', $affectedIds)
                    ->delete();
            }

            foreach (array_chunk($pivotRows, 500) as $chunk) {
                DB::table('recruitment_indice_augmentation')->insert($chunk);
            }
        }

        return response()->json([
            'imported'      => count($indiceRows),
            'skipped'       => $skipped,
            'augmentations' => count($allAugLibels),
        ], 201);
    }

    public function importAugmentations(Request $request): JsonResponse
    {
        $request->validate([
            'rows'              => ['required', 'array', 'min:1', 'max:2000'],
            'rows.*'            => ['array'],
            'rows.*.libelle'    => ['required', 'string', 'max:255'],
            'rows.*.type'       => ['nullable', 'string'],
            'rows.*.taux'       => ['nullable', 'numeric', 'min:0'],
            'rows.*.unite'      => ['nullable', 'string'],
            'rows.*.date_effet' => ['nullable', 'date'],
            'rows.*.description'=> ['nullable', 'string'],
        ]);

        $validTypes = ['indiciaire', 'indemnitaire', 'prime', 'autre'];
        $imported = 0;
        $skipped  = 0;

        foreach ($request->input('rows') as $row) {
            $libelle = trim($row['libelle'] ?? '');
            if (!$libelle) { $skipped++; continue; }

            $type = strtolower(trim($row['type'] ?? 'indemnitaire'));
            if (!in_array($type, $validTypes)) $type = 'indemnitaire';

            $unite = strtolower(trim($row['unite'] ?? ''));
            if (!in_array($unite, ['pourcentage', 'montant'])) $unite = null;

            $taux = isset($row['taux']) && $row['taux'] !== '' ? (float) $row['taux'] : null;

            $dateEffet = null;
            if (!empty($row['date_effet'])) {
                try { $dateEffet = \Carbon\Carbon::parse($row['date_effet'])->toDateString(); } catch (\Exception $e) {}
            }

            RecruitmentAugmentation::updateOrCreate(
                ['libelle' => $libelle],
                [
                    'type'        => $type,
                    'taux'        => $taux,
                    'unite'       => $unite,
                    'date_effet'  => $dateEffet,
                    'description' => trim($row['description'] ?? '') ?: null,
                    'is_active'   => true,
                ]
            );
            $imported++;
        }

        return response()->json(['imported' => $imported, 'skipped' => $skipped], 201);
    }

    public function importBaremes(Request $request): JsonResponse
    {
        $request->validate([
            'rows'                   => ['required', 'array', 'min:1', 'max:5000'],
            'rows.*'                 => ['array'],
            'rows.*.revenu_brut'     => ['required', 'numeric', 'min:0'],
        ]);

        $now  = now();
        $rows = collect($request->input('rows'))->map(function ($row) use ($now) {
            $id = 'IMP_' . now()->format('YmdHis') . '_' . sprintf('%06d', rand(0, 999999));
            return [
                'hierarchy_id'     => null,
                'indice_id'        => null,
                'echelon'          => 1,
                'revenu_brut'      => (float) ($row['revenu_brut']  ?? 0),
                'salaire_base'     => (float) ($row['revenu_brut']  ?? 0),
                'trimf_pers'       => (float) ($row['trimf_pers']   ?? 0),
                'part_1'           => (float) ($row['part_1']       ?? 0),
                'part_1_5'         => (float) ($row['part_1_5']     ?? 0),
                'part_2'           => (float) ($row['part_2']       ?? 0),
                'part_2_5'         => (float) ($row['part_2_5']     ?? 0),
                'part_3'           => (float) ($row['part_3']       ?? 0),
                'part_3_5'         => (float) ($row['part_3_5']     ?? 0),
                'part_4'           => (float) ($row['part_4']       ?? 0),
                'part_4_5'         => (float) ($row['part_4_5']     ?? 0),
                'part_5'           => (float) ($row['part_5']       ?? 0),
                'id_bareme'        => $id,
                'is_active'        => true,
                'created_at'       => $now,
                'updated_at'       => $now,
            ];
        })->toArray();

        foreach (array_chunk($rows, 500) as $chunk) {
            RecruitmentBareme::insert($chunk);
        }

        return response()->json(['imported' => count($rows)], 201);
    }

    // ═══════════════════════════════════════════════════════
    //  CLASSES
    // ═══════════════════════════════════════════════════════

    public function classes(Request $request): JsonResponse
    {
        $query = PaieClasse::with('hierarchy')->orderBy('hierarchy_id')->orderBy('code');

        if ($request->filled('hierarchy_id')) {
            $query->where('hierarchy_id', $request->get('hierarchy_id'));
        }

        return response()->json($query->get());
    }

    public function storeClasse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hierarchy_id' => ['required', 'exists:recruitment_hierarchies,id'],
            'code'         => ['required', 'string', 'max:50'],
            'libelle'      => ['required', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'is_active'    => ['boolean'],
        ]);

        $exists = PaieClasse::where('hierarchy_id', $validated['hierarchy_id'])
            ->where('code', $validated['code'])->exists();

        if ($exists) {
            return response()->json(['message' => 'Ce code existe déjà pour cette hiérarchie.'], 422);
        }

        return response()->json(PaieClasse::create($validated)->load('hierarchy'), 201);
    }

    public function updateClasse(Request $request, PaieClasse $classe): JsonResponse
    {
        $validated = $request->validate([
            'hierarchy_id' => ['sometimes', 'exists:recruitment_hierarchies,id'],
            'code'         => ['sometimes', 'string', 'max:50'],
            'libelle'      => ['sometimes', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'is_active'    => ['boolean'],
        ]);

        $classe->update($validated);

        return response()->json($classe->load('hierarchy'));
    }

    public function destroyClasse(PaieClasse $classe): JsonResponse
    {
        $classe->delete();

        return response()->json(null, 204);
    }

    // ═══════════════════════════════════════════════════════
    //  ÉCHELONS
    // ═══════════════════════════════════════════════════════

    public function echelons(Request $request): JsonResponse
    {
        $query = PaieEchelon::with(['classe.hierarchy'])->orderBy('class_id')->orderBy('numero');

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->get('class_id'));
        }

        if ($request->filled('hierarchy_id')) {
            $query->whereHas('classe', fn ($q) => $q->where('hierarchy_id', $request->get('hierarchy_id')));
        }

        return response()->json($query->get());
    }

    public function storeEchelon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'class_id'    => ['required', 'exists:paie_classes,id'],
            'numero'      => ['required', 'integer', 'min:1'],
            'libelle'     => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['boolean'],
        ]);

        $exists = PaieEchelon::where('class_id', $validated['class_id'])
            ->where('numero', $validated['numero'])->exists();

        if ($exists) {
            return response()->json(['message' => 'Cet échelon existe déjà pour cette classe.'], 422);
        }

        return response()->json(PaieEchelon::create($validated)->load('classe.hierarchy'), 201);
    }

    public function updateEchelon(Request $request, PaieEchelon $echelon): JsonResponse
    {
        $validated = $request->validate([
            'class_id'    => ['sometimes', 'exists:paie_classes,id'],
            'numero'      => ['sometimes', 'integer', 'min:1'],
            'libelle'     => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['boolean'],
        ]);

        $echelon->update($validated);

        return response()->json($echelon->load('classe.hierarchy'));
    }

    public function destroyEchelon(PaieEchelon $echelon): JsonResponse
    {
        $echelon->delete();

        return response()->json(null, 204);
    }

    // ═══════════════════════════════════════════════════════
    //  IMPORT HIÉRARCHIES / CLASSES / ÉCHELONS (Excel)
    // ═══════════════════════════════════════════════════════

    public function importHierarchieClassesEchelons(Request $request): JsonResponse
    {
        $request->validate([
            'hierarchies'                    => ['array'],
            'hierarchies.*.code'             => ['required', 'string', 'max:50'],
            'hierarchies.*.libelle'          => ['required', 'string', 'max:255'],
            'classes'                        => ['array'],
            'classes.*.code_hierarchie'      => ['required', 'string'],
            'classes.*.code'                 => ['required', 'string', 'max:50'],
            'classes.*.libelle'              => ['required', 'string', 'max:255'],
            'echelons'                       => ['array'],
            'echelons.*.code_hierarchie'     => ['required', 'string'],
            'echelons.*.code_classe'         => ['required', 'string'],
            'echelons.*.numero'              => ['required', 'integer', 'min:1'],
        ]);

        $hCount = 0;
        $cCount = 0;
        $eCount = 0;

        // 1. Hiérarchies
        foreach ($request->input('hierarchies', []) as $row) {
            $code = trim($row['code']);
            if (!$code || empty($row['libelle'])) continue;
            RecruitmentHierarchy::updateOrCreate(
                ['code' => $code],
                [
                    'libelle'     => trim($row['libelle']),
                    'description' => $row['description'] ?? null,
                    'ordre'       => (int) ($row['ordre'] ?? 0),
                    'is_active'   => true,
                ]
            );
            $hCount++;
        }

        // Map code => id après upsert
        $hierarchyMap = RecruitmentHierarchy::pluck('id', 'code')->all();

        // 2. Classes
        foreach ($request->input('classes', []) as $row) {
            $hCode = trim($row['code_hierarchie']);
            $cCode = trim($row['code']);
            if (!$hCode || !$cCode || empty($row['libelle'])) continue;
            $hierarchyId = $hierarchyMap[$hCode] ?? null;
            if (!$hierarchyId) continue;
            PaieClasse::updateOrCreate(
                ['hierarchy_id' => $hierarchyId, 'code' => $cCode],
                [
                    'libelle'     => trim($row['libelle']),
                    'description' => $row['description'] ?? null,
                    'is_active'   => true,
                ]
            );
            $cCount++;
        }

        // Map hierarchie_code.classe_code => classe_id
        $classMap = [];
        PaieClasse::with('hierarchy')->get()->each(function ($c) use (&$classMap) {
            $key = ($c->hierarchy?->code ?? '') . '.' . $c->code;
            $classMap[$key] = $c->id;
        });

        // 3. Échelons
        foreach ($request->input('echelons', []) as $row) {
            $hCode = trim($row['code_hierarchie']);
            $cCode = trim($row['code_classe']);
            $num   = (int) ($row['numero'] ?? 0);
            if (!$hCode || !$cCode || $num < 1) continue;
            $classId = $classMap["$hCode.$cCode"] ?? null;
            if (!$classId) continue;
            PaieEchelon::updateOrCreate(
                ['class_id' => $classId, 'numero' => $num],
                [
                    'libelle'     => $row['libelle'] ?? null,
                    'description' => $row['description'] ?? null,
                    'is_active'   => true,
                ]
            );
            $eCount++;
        }

        return response()->json([
            'hierarchies' => $hCount,
            'classes'     => $cCount,
            'echelons'    => $eCount,
        ], 201);
    }

    // ═══════════════════════════════════════════════════════
    //  COTISATIONS
    // ═══════════════════════════════════════════════════════

    public function cotisations(): JsonResponse
    {
        return response()->json(
            PayrollCotisation::orderBy('type')->orderBy('libelle')->get()
        );
    }

    public function storeCotisation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'           => ['nullable', 'string', 'max:30', 'unique:payroll_cotisations,code'],
            'libelle'        => ['required', 'string', 'max:255'],
            'type'           => ['required', 'string', 'max:50'],
            'taux_salarial'  => ['nullable', 'numeric', 'min:0', 'max:100'],
            'taux_patronal'  => ['nullable', 'numeric', 'min:0', 'max:100'],
            'plafond'        => ['nullable', 'numeric', 'min:0'],
            'assiette'       => ['in:brut,net,autre'],
            'description'    => ['nullable', 'string'],
            'is_active'      => ['boolean'],
        ]);

        return response()->json(PayrollCotisation::create($validated), 201);
    }

    public function updateCotisation(Request $request, PayrollCotisation $cotisation): JsonResponse
    {
        $validated = $request->validate([
            'code'           => ['nullable', 'string', 'max:30', 'unique:payroll_cotisations,code,' . $cotisation->id],
            'libelle'        => ['sometimes', 'string', 'max:255'],
            'type'           => ['sometimes', 'string', 'max:50'],
            'taux_salarial'  => ['nullable', 'numeric', 'min:0', 'max:100'],
            'taux_patronal'  => ['nullable', 'numeric', 'min:0', 'max:100'],
            'plafond'        => ['nullable', 'numeric', 'min:0'],
            'assiette'       => ['sometimes', 'in:brut,net,autre'],
            'description'    => ['nullable', 'string'],
            'is_active'      => ['boolean'],
        ]);

        $cotisation->update($validated);

        return response()->json($cotisation);
    }

    public function destroyCotisation(PayrollCotisation $cotisation): JsonResponse
    {
        $cotisation->delete();

        return response()->json(null, 204);
    }

    // ═══════════════════════════════════════════════════════
    //  AUTRES RUBRIQUES
    // ═══════════════════════════════════════════════════════

    public function autresRubriques(): JsonResponse
    {
        return response()->json(
            PayrollAutreRubrique::orderBy('sens')->orderBy('libelle')->get()
        );
    }

    public function storeAutreRubrique(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'        => ['nullable', 'string', 'max:30', 'unique:payroll_autres_rubriques,code'],
            'libelle'     => ['required', 'string', 'max:255'],
            'type'        => ['required', 'string', 'max:50'],
            'sens'        => ['required', 'in:gain,retenue'],
            'unite'       => ['nullable', 'in:pourcentage,montant'],
            'valeur'      => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['boolean'],
        ]);

        return response()->json(PayrollAutreRubrique::create($validated), 201);
    }

    public function updateAutreRubrique(Request $request, PayrollAutreRubrique $autreRubrique): JsonResponse
    {
        $validated = $request->validate([
            'code'        => ['nullable', 'string', 'max:30', 'unique:payroll_autres_rubriques,code,' . $autreRubrique->id],
            'libelle'     => ['sometimes', 'string', 'max:255'],
            'type'        => ['sometimes', 'string', 'max:50'],
            'sens'        => ['sometimes', 'in:gain,retenue'],
            'unite'       => ['nullable', 'in:pourcentage,montant'],
            'valeur'      => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['boolean'],
        ]);

        $autreRubrique->update($validated);

        return response()->json($autreRubrique);
    }

    public function destroyAutreRubrique(PayrollAutreRubrique $autreRubrique): JsonResponse
    {
        $autreRubrique->delete();

        return response()->json(null, 204);
    }
}
