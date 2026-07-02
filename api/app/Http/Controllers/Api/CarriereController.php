<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Avancement;
use App\Models\Employee;
use App\Models\EvaluationAnnuelle;
use App\Models\MobiliteInterne;
use App\Models\PdiAction;
use App\Models\PlanDeveloppementIndividuel;
use App\Models\Promotion;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CarriereController extends Controller
{
    // ═══════════════════════════════════════════════════════════════
    // ÉVALUATIONS ANNUELLES
    // ═══════════════════════════════════════════════════════════════

    public function evaluations(Request $request)
    {
        $query = EvaluationAnnuelle::with([
            'employee:id,first_name,last_name,employee_number,department_id,position_id,categorie_emploi,echelon',
            'employee.department:id,name',
            'employee.position:id,title',
            'evaluateur:id,name',
        ])->orderByDesc('annee')->orderBy('employee_id');

        if ($request->filled('annee')) {
            $query->where('annee', $request->annee);
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        return response()->json($query->get());
    }

    public function storeEvaluation(Request $request)
    {
        $data = $request->validate([
            'employee_id'            => 'required|exists:employees,id',
            'evaluateur_id'          => 'required|exists:users,id',
            'annee'                  => 'required|integer|min:2000|max:2100',
            'statut'                 => 'sometimes|in:brouillon,soumise,validee',
            'note_resultats'         => 'nullable|numeric|min:0|max:4',
            'note_competences'       => 'nullable|numeric|min:0|max:4',
            'note_comportement'      => 'nullable|numeric|min:0|max:4',
            'note_developpement'     => 'nullable|numeric|min:0|max:4',
            'objectifs_annee'        => 'nullable|string',
            'commentaire_evaluateur' => 'nullable|string',
            'commentaire_agent'      => 'nullable|string',
            'date_entretien'         => 'nullable|date',
            'date_validation'        => 'nullable|date',
        ]);

        $eval = EvaluationAnnuelle::create($data);

        // Créer automatiquement un PDI si note passable ou insuffisant
        if ($eval->note_globale !== null && $eval->note_globale < 2.5) {
            PlanDeveloppementIndividuel::firstOrCreate(
                ['employee_id' => $eval->employee_id, 'annee' => $eval->annee],
                ['evaluation_annuelle_id' => $eval->id, 'statut' => 'brouillon']
            );
        }

        return response()->json($eval->load(['employee.department', 'employee.position', 'evaluateur']), 201);
    }

    public function updateEvaluation(Request $request, EvaluationAnnuelle $evaluation)
    {
        $data = $request->validate([
            'statut'                 => 'sometimes|in:brouillon,soumise,validee',
            'note_resultats'         => 'nullable|numeric|min:0|max:4',
            'note_competences'       => 'nullable|numeric|min:0|max:4',
            'note_comportement'      => 'nullable|numeric|min:0|max:4',
            'note_developpement'     => 'nullable|numeric|min:0|max:4',
            'objectifs_annee'        => 'nullable|string',
            'commentaire_evaluateur' => 'nullable|string',
            'commentaire_agent'      => 'nullable|string',
            'date_entretien'         => 'nullable|date',
            'date_validation'        => 'nullable|date',
        ]);

        $evaluation->update($data);

        return response()->json($evaluation->fresh(['employee.department', 'employee.position', 'evaluateur']));
    }

    // ═══════════════════════════════════════════════════════════════
    // AVANCEMENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calcule la liste des agents éligibles à un avancement.
     * Règle : durée min atteinte + note >= 2.0 + pas de sanction active.
     */
    public function eligiblesAvancement()
    {
        $durees = ['A1' => 3, 'A2' => 3, 'B1' => 2, 'B2' => 2, 'C' => 2, 'D' => 1, 'E' => 1];
        $today  = Carbon::today();

        $employees = Employee::with([
            'department:id,name',
            'position:id,title',
        ])
        ->whereNotNull('categorie_emploi')
        ->whereNotNull('date_entree_echelon')
        ->get();

        $eligibles = $employees->filter(function (Employee $emp) use ($durees, $today) {
            $cat     = $emp->categorie_emploi;
            $duree   = $durees[$cat] ?? 2;
            $dateMin = Carbon::parse($emp->date_entree_echelon)->addYears($duree);

            if ($today->lt($dateMin)) return false;

            // Dernière évaluation annuelle
            $lastEval = EvaluationAnnuelle::where('employee_id', $emp->id)
                ->where('statut', 'validee')
                ->orderByDesc('annee')
                ->first();

            if (!$lastEval || $lastEval->note_globale < 2.0) return false;

            // Pas d'avancement déjà en cours
            $enCours = Avancement::where('employee_id', $emp->id)
                ->whereIn('statut', ['en_attente_daf', 'en_attente_dg'])
                ->exists();

            if ($enCours) return false;

            return true;
        })->values();

        return response()->json($eligibles->map(function (Employee $emp) use ($durees) {
            $lastEval = EvaluationAnnuelle::where('employee_id', $emp->id)
                ->where('statut', 'validee')
                ->orderByDesc('annee')
                ->first();

            $cat   = $emp->categorie_emploi;
            $duree = $durees[$cat] ?? 2;

            return [
                'employee'          => $emp,
                'date_echelon'      => $emp->date_entree_echelon,
                'duree_min_ans'     => $duree,
                'date_eligibilite'  => Carbon::parse($emp->date_entree_echelon)->addYears($duree)->toDateString(),
                'note_derniere_eval'=> $lastEval?->note_globale,
                'appreciation'      => $lastEval?->appreciation,
                'annee_eval'        => $lastEval?->annee,
            ];
        }));
    }

    public function avancements(Request $request)
    {
        $query = Avancement::with([
            'employee:id,first_name,last_name,employee_number,categorie_emploi,echelon',
            'employee.department:id,name',
            'initiePar:id,name',
        ])->orderByDesc('created_at');

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        return response()->json($query->get());
    }

    public function storeAvancement(Request $request)
    {
        $data = $request->validate([
            'employee_id'          => 'required|exists:employees,id',
            'date_eligibilite'     => 'required|date',
            'note_evaluation'      => 'nullable|numeric',
            'evaluation_annuelle_id' => 'nullable|exists:evaluations_annuelles,id',
        ]);

        $emp = Employee::findOrFail($data['employee_id']);

        $avancement = Avancement::create([
            ...$data,
            'categorie'      => $emp->categorie_emploi,
            'echelon_avant'  => $emp->echelon,
            'echelon_apres'  => $emp->echelon + 1,
            'initie_par_id'  => $request->user()->id,
            'statut'         => 'en_attente_daf',
        ]);

        return response()->json($avancement->load(['employee', 'initiePar']), 201);
    }

    public function validerAvancement(Request $request, Avancement $avancement)
    {
        $data = $request->validate([
            'action'       => 'required|in:valider_daf,valider_dg,refuser,reporter',
            'motif_refus'  => 'nullable|string',
        ]);

        $user = $request->user();

        DB::transaction(function () use ($avancement, $data, $user) {
            switch ($data['action']) {
                case 'valider_daf':
                    $avancement->update([
                        'valide_par_daf_id' => $user->id,
                        'statut'            => 'en_attente_dg',
                    ]);
                    break;

                case 'valider_dg':
                    $avancement->update([
                        'decide_par_dg_id' => $user->id,
                        'decision'         => 'accorde',
                        'date_decision'    => today(),
                        'statut'           => 'accorde',
                    ]);
                    // Appliquer l'avancement sur l'agent
                    Employee::where('id', $avancement->employee_id)->update([
                        'echelon'             => $avancement->echelon_apres,
                        'date_entree_echelon' => today(),
                    ]);
                    break;

                case 'refuser':
                    $avancement->update([
                        'decision'      => 'refuse',
                        'motif_refus'   => $data['motif_refus'] ?? null,
                        'date_decision' => today(),
                        'statut'        => 'refuse',
                    ]);
                    break;

                case 'reporter':
                    $avancement->update([
                        'decision' => 'reporte',
                        'statut'   => 'reporte',
                    ]);
                    break;
            }
        });

        return response()->json($avancement->fresh(['employee', 'initiePar', 'valideDaf', 'decideDg']));
    }

    // ═══════════════════════════════════════════════════════════════
    // PROMOTIONS
    // ═══════════════════════════════════════════════════════════════

    public function promotions(Request $request)
    {
        $query = Promotion::with([
            'employee:id,first_name,last_name,employee_number,categorie_emploi,echelon',
            'employee.department:id,name',
        ])->orderByDesc('created_at');

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        return response()->json($query->get());
    }

    public function storePromotion(Request $request)
    {
        $data = $request->validate([
            'employee_id'    => 'required|exists:employees,id',
            'categorie_apres'=> 'required|in:A1,A2,B1,B2,C,D,E',
            'type_promotion' => 'required|in:au_choix,concours_interne,formation_qualifiante',
            'commentaire'    => 'nullable|string',
        ]);

        $emp = Employee::findOrFail($data['employee_id']);

        // Récupérer les 2 dernières notes
        $evals = EvaluationAnnuelle::where('employee_id', $emp->id)
            ->where('statut', 'validee')
            ->orderByDesc('annee')
            ->take(2)
            ->pluck('note_globale');

        $hireDate = Carbon::parse($emp->hire_date);

        $promotion = Promotion::create([
            ...$data,
            'categorie_avant'        => $emp->categorie_emploi,
            'annees_dans_categorie'  => $hireDate->diffInYears(today()),
            'note_eval_n1'           => $evals->get(0),
            'note_eval_n2'           => $evals->get(1),
            'statut'                 => 'appel_candidature',
        ]);

        return response()->json($promotion->load('employee'), 201);
    }

    public function validerPromotion(Request $request, Promotion $promotion)
    {
        $data = $request->validate([
            'action'           => 'required|in:commission,accorder,refuser',
            'commission_date'  => 'nullable|date',
            'commission_avis'  => 'nullable|in:favorable,defavorable,reporte',
            'date_effet'       => 'nullable|date',
        ]);

        DB::transaction(function () use ($promotion, $data, $request) {
            switch ($data['action']) {
                case 'commission':
                    $promotion->update([
                        'commission_date' => $data['commission_date'] ?? today(),
                        'commission_avis' => $data['commission_avis'],
                        'statut'          => 'commission_tenue',
                    ]);
                    break;

                case 'accorder':
                    $effetDate = $data['date_effet']
                        ?? Carbon::today()->startOfMonth()->addMonthNoOverflow()->toDateString();

                    $promotion->update([
                        'decide_par_dg_id' => $request->user()->id,
                        'date_decision'    => today(),
                        'date_effet'       => $effetDate,
                        'statut'           => 'accorde',
                    ]);
                    // Appliquer la promotion sur l'agent
                    Employee::where('id', $promotion->employee_id)->update([
                        'categorie_emploi'   => $promotion->categorie_apres,
                        'echelon'            => 1,
                        'date_entree_echelon'=> $effetDate,
                    ]);
                    break;

                case 'refuser':
                    $promotion->update([
                        'decide_par_dg_id' => $request->user()->id,
                        'date_decision'    => today(),
                        'statut'           => 'refuse',
                    ]);
                    break;
            }
        });

        return response()->json($promotion->fresh('employee'));
    }

    // ═══════════════════════════════════════════════════════════════
    // PLANS DE DÉVELOPPEMENT INDIVIDUEL (PDI)
    // ═══════════════════════════════════════════════════════════════

    public function pdis(Request $request)
    {
        $query = PlanDeveloppementIndividuel::with([
            'employee:id,first_name,last_name,employee_number',
            'employee.department:id,name',
            'actions',
        ])->orderByDesc('annee');

        if ($request->filled('annee')) {
            $query->where('annee', $request->annee);
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        return response()->json($query->get());
    }

    public function storePdi(Request $request)
    {
        $data = $request->validate([
            'employee_id'              => 'required|exists:employees,id',
            'annee'                    => 'required|integer',
            'evaluation_annuelle_id'   => 'nullable|exists:evaluations_annuelles,id',
            'objectifs_professionnels' => 'nullable|string',
            'competences_a_renforcer'  => 'nullable|string',
            'commentaire_rh'           => 'nullable|string',
            'actions'                  => 'nullable|array',
            'actions.*.type'           => 'required|in:formation,mission,projet_transverse',
            'actions.*.intitule'       => 'required|string',
            'actions.*.organisme'      => 'nullable|string',
            'actions.*.duree_jours'    => 'nullable|integer',
            'actions.*.echeance'       => 'nullable|date',
            'actions.*.indicateur_suivi' => 'nullable|string',
        ]);

        $pdi = PlanDeveloppementIndividuel::create(collect($data)->except('actions')->toArray());

        foreach (($data['actions'] ?? []) as $action) {
            $pdi->actions()->create($action);
        }

        return response()->json($pdi->load(['employee', 'actions']), 201);
    }

    public function updatePdi(Request $request, PlanDeveloppementIndividuel $pdi)
    {
        $data = $request->validate([
            'objectifs_professionnels' => 'nullable|string',
            'competences_a_renforcer'  => 'nullable|string',
            'commentaire_rh'           => 'nullable|string',
            'commentaire_agent'        => 'nullable|string',
            'statut'                   => 'sometimes|in:brouillon,soumis,valide',
            'actions'                  => 'nullable|array',
            'actions.*.id'             => 'nullable|exists:pdi_actions,id',
            'actions.*.type'           => 'required|in:formation,mission,projet_transverse',
            'actions.*.intitule'       => 'required|string',
            'actions.*.organisme'      => 'nullable|string',
            'actions.*.duree_jours'    => 'nullable|integer',
            'actions.*.echeance'       => 'nullable|date',
            'actions.*.indicateur_suivi' => 'nullable|string',
            'actions.*.statut'         => 'nullable|in:planifie,en_cours,realise,abandonne',
        ]);

        if (isset($data['statut']) && $data['statut'] === 'valide') {
            $data['valide_par_rh_id'] = $request->user()->id;
            $data['date_validation']  = today();
        }

        $pdi->update(collect($data)->except('actions')->toArray());

        if (isset($data['actions'])) {
            // Supprimer les actions supprimées, upsert les autres
            $incomingIds = collect($data['actions'])->pluck('id')->filter()->all();
            $pdi->actions()->whereNotIn('id', $incomingIds)->delete();

            foreach ($data['actions'] as $a) {
                if (!empty($a['id'])) {
                    PdiAction::where('id', $a['id'])->update(collect($a)->except('id')->toArray());
                } else {
                    $pdi->actions()->create($a);
                }
            }
        }

        return response()->json($pdi->fresh(['employee', 'actions']));
    }

    // ═══════════════════════════════════════════════════════════════
    // MOBILITÉS INTERNES
    // ═══════════════════════════════════════════════════════════════

    public function mobilites(Request $request)
    {
        $query = MobiliteInterne::with([
            'employee:id,first_name,last_name,employee_number',
            'employee.department:id,name',
            'departmentAvant:id,name',
            'departmentApres:id,name',
            'positionAvant:id,title',
            'positionApres:id,title',
        ])->orderByDesc('date_demande');

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        return response()->json($query->get());
    }

    public function storeMobilite(Request $request)
    {
        $data = $request->validate([
            'employee_id'        => 'required|exists:employees,id',
            'type_mobilite'      => 'required|in:fonctionnelle,geographique,organisationnelle',
            'initiateur'         => 'required|in:agent,hierarchie,direction',
            'department_apres_id'=> 'nullable|exists:departments,id',
            'position_apres_id'  => 'nullable|exists:positions,id',
            'motif'              => 'nullable|string',
            'date_demande'       => 'required|date',
        ]);

        $emp = Employee::findOrFail($data['employee_id']);

        $mobilite = MobiliteInterne::create([
            ...$data,
            'department_avant_id' => $emp->department_id,
            'position_avant_id'   => $emp->position_id,
            'date_preavis_30j'    => Carbon::parse($data['date_demande'])->addDays(30)->toDateString(),
            'statut'              => 'en_etude',
        ]);

        return response()->json($mobilite->load([
            'employee', 'departmentAvant', 'departmentApres', 'positionAvant', 'positionApres',
        ]), 201);
    }

    public function validerMobilite(Request $request, MobiliteInterne $mobilite)
    {
        $data = $request->validate([
            'action'           => 'required|in:soumettre_sg,approuver,refuser',
            'date_prise_effet' => 'nullable|date',
        ]);

        DB::transaction(function () use ($mobilite, $data, $request) {
            switch ($data['action']) {
                case 'soumettre_sg':
                    $mobilite->update(['statut' => 'soumise_sg']);
                    break;

                case 'approuver':
                    $effetDate = $data['date_prise_effet'] ?? today()->toDateString();
                    $mobilite->update([
                        'decide_par_dg_id' => $request->user()->id,
                        'date_decision'    => today(),
                        'date_prise_effet' => $effetDate,
                        'statut'           => 'approuvee',
                    ]);
                    // Appliquer la mobilité sur l'agent
                    Employee::where('id', $mobilite->employee_id)->update([
                        'department_id' => $mobilite->department_apres_id,
                        'position_id'   => $mobilite->position_apres_id,
                    ]);
                    break;

                case 'refuser':
                    $mobilite->update([
                        'decide_par_dg_id' => $request->user()->id,
                        'date_decision'    => today(),
                        'statut'           => 'refusee',
                    ]);
                    break;
            }
        });

        return response()->json($mobilite->fresh([
            'employee', 'departmentAvant', 'departmentApres', 'positionAvant', 'positionApres',
        ]));
    }
}
