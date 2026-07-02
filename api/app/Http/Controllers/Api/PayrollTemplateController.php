<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollCotisation;
use App\Models\PayrollTemplate;
use App\Models\PayrollTemplateLine;
use App\Models\RecruitmentAugmentation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollTemplateController extends Controller
{
    // ── Liste des modèles ─────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $templates = PayrollTemplate::orderBy('created_at', 'desc')->get();
        return response()->json($templates);
    }

    // ── Détail d'un modèle avec ses lignes ───────────────────────────────────

    public function show(PayrollTemplate $payrollTemplate): JsonResponse
    {
        $payrollTemplate->load('lines');
        return response()->json($payrollTemplate);
    }

    // ── Création ─────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'                          => ['required', 'string', 'max:150'],
            'description'                   => ['nullable', 'string'],
            'creation_date'                 => ['nullable', 'date'],
            'is_active'                     => ['boolean'],
            'lines'                         => ['array'],
            'lines.*.type'                  => ['required', 'in:base,augmentation,ipress,ipm,css,ir,trimf,retenue'],
            'lines.*.libelle'               => ['required', 'string'],
            'lines.*.nombre'                => ['nullable', 'numeric'],
            'lines.*.base_calcul'           => ['nullable', 'numeric'],
            'lines.*.gain'                  => ['nullable', 'numeric'],
            'lines.*.taux_salarial'         => ['nullable', 'numeric'],
            'lines.*.retenu_salarial'       => ['nullable', 'numeric'],
            'lines.*.taux_patronal'         => ['nullable', 'numeric'],
            'lines.*.retenu_patronal'       => ['nullable', 'numeric'],
        ]);

        $template = PayrollTemplate::create([
            'name'          => $request->name,
            'description'   => $request->description,
            'creation_date' => $request->creation_date,
            'is_active'     => $request->boolean('is_active', true),
        ]);

        $this->syncLines($template, $request->input('lines', []));

        $template->load('lines');
        return response()->json($template, 201);
    }

    // ── Mise à jour ───────────────────────────────────────────────────────────

    public function update(Request $request, PayrollTemplate $payrollTemplate): JsonResponse
    {
        $request->validate([
            'name'          => ['sometimes', 'string', 'max:150'],
            'description'   => ['nullable', 'string'],
            'creation_date' => ['nullable', 'date'],
            'is_active'     => ['boolean'],
            'lines'         => ['array'],
        ]);

        $payrollTemplate->update($request->only(['name', 'description', 'creation_date', 'is_active']));

        if ($request->has('lines')) {
            $this->syncLines($payrollTemplate, $request->input('lines', []));
        }

        $payrollTemplate->load('lines');
        return response()->json($payrollTemplate);
    }

    // ── Suppression ───────────────────────────────────────────────────────────

    public function destroy(PayrollTemplate $payrollTemplate): JsonResponse
    {
        $payrollTemplate->delete();
        return response()->json(null, 204);
    }

    // ── Rubriques disponibles par type ────────────────────────────────────────

    public function rubriques(string $type): JsonResponse
    {
        $data = match ($type) {
            'augmentation' => RecruitmentAugmentation::where('is_active', true)
                ->orderBy('libelle')
                ->get()
                ->map(fn($r) => [
                    'id'              => $r->id,
                    'rubrique_type'   => 'augmentation',
                    'code'            => $r->type ?? '',
                    'libelle'         => $r->libelle,
                    'taux_salarial'   => (float) ($r->taux ?? 0),
                    'taux_patronal'   => 0,
                    'unite'           => $r->unite ?? '',
                ]),

            'ipress' => PayrollCotisation::where('is_active', true)
                ->where('type', 'IPRES')
                ->orderBy('libelle')
                ->get()
                ->map(fn($r) => [
                    'id'            => $r->id,
                    'rubrique_type' => 'cotisation',
                    'code'          => $r->code ?? '',
                    'libelle'       => $r->libelle,
                    'taux_salarial' => (float) ($r->taux_salarial ?? 0),
                    'taux_patronal' => (float) ($r->taux_patronal ?? 0),
                    'plafond'       => (float) ($r->plafond ?? 0),
                ]),

            'ipm' => PayrollCotisation::where('is_active', true)
                ->where('type', 'IPM')
                ->orderBy('libelle')
                ->get()
                ->map(fn($r) => [
                    'id'            => $r->id,
                    'rubrique_type' => 'cotisation',
                    'code'          => $r->code ?? '',
                    'libelle'       => $r->libelle,
                    'taux_salarial' => (float) ($r->taux_salarial ?? 0),
                    'taux_patronal' => (float) ($r->taux_patronal ?? 0),
                    'plafond'       => (float) ($r->plafond ?? 0),
                ]),

            'css' => PayrollCotisation::where('is_active', true)
                ->where('type', 'CSS')
                ->orderBy('libelle')
                ->get()
                ->map(fn($r) => [
                    'id'            => $r->id,
                    'rubrique_type' => 'cotisation',
                    'code'          => $r->code ?? '',
                    'libelle'       => $r->libelle,
                    'taux_salarial' => (float) ($r->taux_salarial ?? 0),
                    'taux_patronal' => (float) ($r->taux_patronal ?? 0),
                    'plafond'       => (float) ($r->plafond ?? 0),
                ]),

            'ir' => PayrollCotisation::where('is_active', true)
                ->where('type', 'IR')
                ->orderBy('libelle')
                ->get()
                ->map(fn($r) => [
                    'id'            => $r->id,
                    'rubrique_type' => 'cotisation',
                    'code'          => $r->code ?? '',
                    'libelle'       => $r->libelle,
                    'taux_salarial' => (float) ($r->taux_salarial ?? 0),
                    'taux_patronal' => (float) ($r->taux_patronal ?? 0),
                    'plafond'       => (float) ($r->plafond ?? 0),
                ]),

            'trimf' => PayrollCotisation::where('is_active', true)
                ->where('type', 'TRIMF')
                ->orderBy('libelle')
                ->get()
                ->map(fn($r) => [
                    'id'            => $r->id,
                    'rubrique_type' => 'cotisation',
                    'code'          => $r->code ?? '',
                    'libelle'       => $r->libelle,
                    'taux_salarial' => (float) ($r->taux_salarial ?? 0),
                    'taux_patronal' => (float) ($r->taux_patronal ?? 0),
                    'plafond'       => (float) ($r->plafond ?? 0),
                ]),

            'retenue' => \App\Models\PayrollAutreRubrique::where('is_active', true)
                ->orderBy('libelle')
                ->get()
                ->map(fn($r) => [
                    'id'            => $r->id,
                    'rubrique_type' => 'autre',
                    'code'          => $r->code ?? '',
                    'libelle'       => $r->libelle,
                    'taux_salarial' => 0,
                    'taux_patronal' => 0,
                    'valeur'        => (float) ($r->valeur ?? 0),
                    'sens'          => $r->sens ?? 'retenue',
                    'unite'         => $r->unite ?? 'montant',
                ]),

            default => collect(),
        };

        return response()->json($data);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function syncLines(PayrollTemplate $template, array $lines): void
    {
        $template->lines()->delete();

        // Ordre automatique par section dans l'ordre : augmentation → ipress → ipm → css → ir → trimf
        $sectionOrder = ['base' => 0, 'augmentation' => 100, 'ipress' => 200, 'ipm' => 300, 'css' => 400, 'ir' => 500, 'trimf' => 600, 'retenue' => 700];
        $counters      = array_fill_keys(array_keys($sectionOrder), 0);

        foreach ($lines as $line) {
            $type         = $line['type'];
            $sectionBase  = $sectionOrder[$type] ?? 0;
            $ordre        = $sectionBase + ($counters[$type] ?? 0);
            $counters[$type]++;

            PayrollTemplateLine::create([
                'template_id'     => $template->id,
                'type'            => $type,
                'rubrique_id'     => $line['rubrique_id']   ?? null,
                'rubrique_type'   => $line['rubrique_type'] ?? null,
                'code'            => $line['code']          ?? null,
                'libelle'         => $line['libelle'],
                'nombre'          => $line['nombre']          ?? 1,
                'base_calcul'     => $line['base_calcul']     ?? 0,
                'gain'            => $line['gain']            ?? 0,
                'taux_salarial'   => $line['taux_salarial']   ?? 0,
                'retenu_salarial' => $line['retenu_salarial'] ?? 0,
                'taux_patronal'   => $line['taux_patronal']   ?? 0,
                'retenu_patronal' => $line['retenu_patronal'] ?? 0,
                'ordre'           => $ordre,
            ]);
        }
    }
}
