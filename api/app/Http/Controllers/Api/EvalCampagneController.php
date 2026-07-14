<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvalAudit;
use App\Models\EvalCampagne;
use App\Models\EvalCritere;
use App\Models\EvalFiche;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class EvalCampagneController extends Controller
{
    /** GET /api/eval/campagnes */
    public function index(): JsonResponse
    {
        $campagnes = EvalCampagne::with(['createur:id,name', 'lanceur:id,name'])
            ->orderByDesc('exercice')
            ->get()
            ->map(function (EvalCampagne $c) {
                $stats = $c->stats();
                return array_merge($c->toArray(), ['stats' => $stats]);
            });

        return response()->json($campagnes);
    }

    /** POST /api/eval/campagnes */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'exercice'                   => 'required|integer|min:2020|unique:eval_campagnes,exercice',
            'titre'                      => 'nullable|string|max:200',
            'periode_debut'              => 'nullable|date',
            'periode_fin'                => 'nullable|date|after_or_equal:periode_debut',
            'date_lancement'             => 'nullable|date',
            'date_limite_planification'  => 'nullable|date',
            'date_limite_entretiens'     => 'nullable|date',
            'date_limite_transmission'   => 'nullable|date',
            'date_limite_synthese'       => 'nullable|date',
            'date_cloture'               => 'nullable|date',
        ]);

        $data['cree_par'] = $request->user()?->id;
        if (empty($data['titre'])) {
            $data['titre'] = 'Campagne d\'évaluation ' . $data['exercice'];
        }

        $campagne = EvalCampagne::create($data);

        EvalAudit::create([
            'user_id'     => $request->user()?->id,
            'action'      => 'campagne.creer',
            'entite_type' => 'EvalCampagne',
            'entite_id'   => $campagne->id,
        ]);

        return response()->json($campagne->load('createur:id,name'), 201);
    }

    /** GET /api/eval/campagnes/{id} */
    public function show(EvalCampagne $campagne): JsonResponse
    {
        return response()->json([
            'campagne' => $campagne->load(['createur:id,name', 'lanceur:id,name']),
            'stats'    => $campagne->stats(),
        ]);
    }

    /** PUT /api/eval/campagnes/{id} — Modifier une campagne */
    public function update(Request $request, EvalCampagne $campagne): JsonResponse
    {
        $data = $request->validate([
            'exercice'      => 'sometimes|integer|min:2020|unique:eval_campagnes,exercice,' . $campagne->id,
            'titre'         => 'nullable|string|max:200',
            'periode_debut' => 'nullable|date',
            'periode_fin'   => 'nullable|date|after_or_equal:periode_debut',
        ]);

        $campagne->update($data);

        EvalAudit::create([
            'user_id'     => $request->user()?->id,
            'action'      => 'campagne.modifier',
            'entite_type' => 'EvalCampagne',
            'entite_id'   => $campagne->id,
        ]);

        $stats = $campagne->stats();
        return response()->json(array_merge($campagne->fresh()->load(['createur:id,name', 'lanceur:id,name'])->toArray(), ['stats' => $stats]));
    }

    /**
     * PUT /api/eval/campagnes/{id}/lancer
     * Lance la campagne et génère une fiche par agent actif.
     */
    public function lancer(Request $request, EvalCampagne $campagne): JsonResponse
    {
        if ($campagne->statut !== 'preparation') {
            return response()->json(['message' => 'Cette campagne est déjà lancée.'], 422);
        }

        $employees = Employee::whereNull('termination_date')
            ->where('status', 'active')
            ->get();

        $critereIds = EvalCritere::where('actif', true)->pluck('id');
        $created    = 0;

        foreach ($employees as $employee) {
            // Détermine le statut agent pour la grille dynamique
            $statutAgent = $this->detecterStatutAgent($employee);

            $anciennete = null;
            if ($employee->hire_date) {
                $anciennete = (int) Carbon::parse($employee->hire_date)->diffInMonths(now());
            }

            // Évite les doublons si re-lancé
            $fiche = EvalFiche::firstOrCreate(
                ['campagne_id' => $campagne->id, 'employee_id' => $employee->id],
                [
                    'evaluateur_id'           => $employee->manager_id
                        ? Employee::find($employee->manager_id)?->user_id
                        : null,
                    'statut'                  => 'a_planifier',
                    'statut_agent'            => $statutAgent,
                    'snapshot_matricule'      => $employee->employee_number,
                    'snapshot_fonction'       => $employee->fonction,
                    'snapshot_direction'      => $employee->department?->name,
                    'snapshot_service'        => $employee->position?->title,
                    'snapshot_anciennete_mois'=> $anciennete,
                ]
            );

            $created++;
        }

        $campagne->update([
            'statut'   => 'active',
            'lance_par'=> $request->user()?->id,
            'lance_at' => now(),
        ]);

        EvalAudit::create([
            'user_id'     => $request->user()?->id,
            'action'      => 'campagne.lancer',
            'entite_type' => 'EvalCampagne',
            'entite_id'   => $campagne->id,
            'meta'        => ['fiches_generees' => $created],
        ]);

        return response()->json([
            'message'         => "Campagne lancée. {$created} fiche(s) générée(s).",
            'campagne'        => $campagne->fresh()->load('lanceur:id,name'),
            'fiches_generees' => $created,
        ]);
    }

    /** GET /api/eval/campagnes/{id}/synthese — Tableau de synthèse consolidé (CDC §7.4) */
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
            ->whereIn('statut', ['transmise_daf', 'annotee_dg', 'notifiee', 'archivee'])
            ->get();

        // Regroupement par direction
        $parDirection = $fiches->groupBy(fn($f) => $f->employee->department?->name ?? 'Non affectée');

        $synthese = $parDirection->map(function ($fichesDir, $direction) {
            return [
                'direction' => $direction,
                'nb_agents' => $fichesDir->count(),
                'moyenne_direction' => round($fichesDir->whereNotNull('moyenne')->avg('moyenne') ?? 0, 2),
                'agents' => $fichesDir->map(fn($f) => [
                    'id'           => $f->id,
                    'matricule'    => $f->snapshot_matricule,
                    'nom_complet'  => $f->employee->first_name . ' ' . $f->employee->last_name,
                    'fonction'     => $f->snapshot_fonction,
                    'moyenne'      => $f->moyenne,
                    'appreciation' => $f->appreciation,
                    'decisions'    => $f->decisionRh,
                    'besoins'      => $f->besoinsFormation->pluck('intitule'),
                ]),
            ];
        })->values();

        return response()->json([
            'campagne'       => $campagne->only(['id', 'exercice', 'titre']),
            'synthese'       => $synthese,
            'total_fiches'   => $fiches->count(),
            'moyenne_globale'=> round($fiches->whereNotNull('moyenne')->avg('moyenne') ?? 0, 2),
        ]);
    }

    /** DELETE /api/eval/campagnes/{id} — supprime la campagne et toutes ses fiches */
    public function destroy(EvalCampagne $campagne): JsonResponse
    {
        // Suppression en cascade via les FK (fiches → notations/besoins/objectifs/décisions/audit)
        $nbFiches = $campagne->fiches()->count();
        $campagne->delete();

        return response()->json([
            'message' => "Campagne \"{$campagne->titre}\" supprimée avec {$nbFiches} fiche(s).",
        ]);
    }

    /** Détecte le statut agent à partir du champ categorie_emploi / qualification. */
    private function detecterStatutAgent(Employee $employee): string
    {
        $cat = strtolower($employee->categorie_emploi ?? '');
        if (str_contains($cat, 'fonctionnaire') || str_contains($cat, 'détach')) {
            return 'fonctionnaire';
        }
        if (str_contains($cat, 'décision') || str_contains($cat, 'decisionnaire')) {
            return 'decisionnaire';
        }
        return 'contractuel';
    }
}
