<?php

namespace App\Http\Controllers\Api;

use App\Models\RecruitmentIndice;
use App\Models\RecruitmentHierarchy;
use App\Models\RecruitmentAugmentation;
use App\Models\RecruitmentBareme;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

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
            'code'           => ['required', 'string', 'max:50', 'unique:recruitment_indices,code'],
            'hierarchy_id'   => ['nullable', 'exists:recruitment_hierarchies,id'],
            'classe'         => ['nullable', 'string', 'max:50'],
            'echelon_label'  => ['nullable', 'string', 'max:50'],
            'valeur_point'   => ['nullable', 'numeric', 'min:0'],
            'valeur'         => ['required', 'integer', 'min:1'],
            'solde_mensuelle'=> ['nullable', 'numeric', 'min:0'],
            'garde'          => ['nullable', 'string', 'max:100'],
            'description'    => ['nullable', 'string', 'max:255'],
            'is_active'      => ['boolean'],
            'augmentation_ids' => ['nullable', 'array'],
            'augmentation_ids.*' => ['exists:recruitment_augmentations,id'],
        ]);

        $augIds = $validated['augmentation_ids'] ?? [];
        unset($validated['augmentation_ids']);

        $indice = RecruitmentIndice::create($validated);
        if ($augIds) {
            $indice->augmentations()->sync($augIds);
        }

        return response()->json($indice->load(['hierarchy', 'augmentations']), 201);
    }

    public function updateIndice(Request $request, RecruitmentIndice $indice): JsonResponse
    {
        $validated = $request->validate([
            'code'           => ['sometimes', 'string', 'max:50', 'unique:recruitment_indices,code,' . $indice->id],
            'hierarchy_id'   => ['nullable', 'exists:recruitment_hierarchies,id'],
            'classe'         => ['nullable', 'string', 'max:50'],
            'echelon_label'  => ['nullable', 'string', 'max:50'],
            'valeur_point'   => ['nullable', 'numeric', 'min:0'],
            'valeur'         => ['sometimes', 'integer', 'min:1'],
            'solde_mensuelle'=> ['nullable', 'numeric', 'min:0'],
            'garde'          => ['nullable', 'string', 'max:100'],
            'description'    => ['nullable', 'string', 'max:255'],
            'is_active'      => ['boolean'],
            'augmentation_ids' => ['nullable', 'array'],
            'augmentation_ids.*' => ['exists:recruitment_augmentations,id'],
        ]);

        $augIds = $validated['augmentation_ids'] ?? null;
        unset($validated['augmentation_ids']);

        $indice->update($validated);
        if ($augIds !== null) {
            $indice->augmentations()->sync($augIds);
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
            'type'        => ['required', 'in:indiciaire,indemnitaire,prime,autre'],
            'taux'        => ['required', 'numeric', 'min:0'],
            'unite'       => ['required', 'in:pourcentage,montant'],
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
            'type'        => ['sometimes', 'in:indiciaire,indemnitaire,prime,autre'],
            'taux'        => ['sometimes', 'numeric', 'min:0'],
            'unite'       => ['sometimes', 'in:pourcentage,montant'],
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
}
