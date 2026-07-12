<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveCarryover;
use App\Services\LeaveCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LeaveCarryoverController extends Controller
{
    public function __construct(private LeaveCalculationService $calculator) {}

    /**
     * Retourne l'état des soldes de congé pour tous les agents actifs,
     * en vue d'un report d'année (clôture annuelle).
     */
    public function index(Request $request)
    {
        $year      = (int) ($request->year ?? Carbon::now()->year);
        $plafond   = (float) ($request->plafond ?? 10);
        $dateRef   = Carbon::createFromDate($year, 12, 31)->endOfDay();

        $employees = Employee::where('status', 'active')
            ->with('department')
            ->orderBy('last_name')
            ->get();

        $rows = $employees->map(function (Employee $emp) use ($year, $plafond, $dateRef) {
            $balance = $this->calculator->getBalance($emp, $dateRef);

            $alreadyApplied = LeaveCarryover::where('employee_id', $emp->id)
                ->where('year', $year)
                ->first();

            $solde        = round((float) $balance['solde_disponible'], 1);
            $jReportes    = round(min($solde, $plafond), 1);

            return [
                'employee_id'      => $emp->id,
                'employee_name'    => $emp->full_name,
                'employee_number'  => $emp->employee_number,
                'department'       => $emp->department?->name ?? '—',
                'solde_disponible' => $solde,
                'plafond'          => $plafond,
                'jours_a_reporter' => $jReportes,
                'already_applied'  => $alreadyApplied !== null,
                'applied_at'       => $alreadyApplied?->applied_at,
                'jours_reportes'   => $alreadyApplied?->jours_reportes,
            ];
        });

        // Historique des reports passés
        $history = LeaveCarryover::with('employee.department', 'appliquePar')
            ->where('year', $year)
            ->orderBy('applied_at', 'desc')
            ->get();

        return response()->json([
            'year'    => $year,
            'plafond' => $plafond,
            'rows'    => $rows,
            'history' => $history,
        ]);
    }

    /**
     * Applique le report pour les agents sélectionnés.
     * Met à jour nbre_jour_restant et date_dernier_calcul_conge.
     */
    public function apply(Request $request)
    {
        $data = $request->validate([
            'year'         => ['required', 'integer', 'min:2020', 'max:2100'],
            'plafond'      => ['required', 'numeric', 'min:0', 'max:60'],
            'employee_ids' => ['required', 'array', 'min:1'],
            'employee_ids.*' => ['integer', 'exists:employees,id'],
        ]);

        $year      = $data['year'];
        $plafond   = (float) $data['plafond'];
        $dateRef   = Carbon::createFromDate($year, 12, 31)->endOfDay();
        $newYearStart = Carbon::createFromDate($year + 1, 1, 1);
        $userId    = $request->user()->id;
        $now       = now();

        $applied   = [];
        $skipped   = [];

        foreach ($data['employee_ids'] as $empId) {
            // Éviter les doublons
            if (LeaveCarryover::where('employee_id', $empId)->where('year', $year)->exists()) {
                $skipped[] = $empId;
                continue;
            }

            $employee = Employee::findOrFail($empId);
            $balance  = $this->calculator->getBalance($employee, $dateRef);
            $solde    = round((float) $balance['solde_disponible'], 1);
            $jReportes = round(min($solde, $plafond), 1);

            // Enregistrer le report
            LeaveCarryover::create([
                'employee_id'     => $empId,
                'year'            => $year,
                'solde_fin_annee' => $solde,
                'plafond'         => $plafond,
                'jours_reportes'  => $jReportes,
                'applique_par'    => $userId,
                'applied_at'      => $now,
            ]);

            // Mettre à jour le solde de l'agent pour la nouvelle année
            $employee->update([
                'nbre_jour_restant'          => $jReportes,
                'date_dernier_calcul_conge'  => $newYearStart->format('Y-m-d'),
            ]);

            $applied[] = [
                'employee_id'   => $empId,
                'employee_name' => $employee->full_name,
                'jours_reportes' => $jReportes,
            ];
        }

        return response()->json([
            'message' => count($applied) . ' report(s) appliqué(s).',
            'applied' => $applied,
            'skipped' => $skipped,
        ]);
    }

    /** Historique complet des reports (toutes années). */
    public function history(Request $request)
    {
        $query = LeaveCarryover::with('employee.department', 'appliquePar')
            ->when($request->year,        fn($q, $y) => $q->where('year', $y))
            ->when($request->employee_id, fn($q, $e) => $q->where('employee_id', $e))
            ->orderByDesc('year')
            ->orderBy('applied_at', 'desc');

        return response()->json($query->paginate(25));
    }
}
