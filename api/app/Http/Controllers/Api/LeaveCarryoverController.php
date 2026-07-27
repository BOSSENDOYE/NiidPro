<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveCarryover;
use App\Models\LeaveSettings;
use App\Services\LeaveCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LeaveCarryoverController extends Controller
{
    public function __construct(private LeaveCalculationService $calculator) {}

    // ────────────────────────────────────────────────────────────────────────
    //  LOGIQUE FIFO + EXPIRY (méthode utilitaire partagée index/apply)
    //
    //  Règles (Code du Travail + paramètres):
    //  • Les jours non pris se reportent à l'année suivante (N → N+1, N+1 → N+2…)
    //  • Après `report_annees_max` années sans prise, l'ancien report EXPIRE (perdu)
    //  • Minimum `min_jours_obligatoires` jours doivent être pris chaque année
    //  • FIFO : les jours les plus anciens (report) sont consommés en premier
    // ────────────────────────────────────────────────────────────────────────
    private function computeCarryover(
        Employee $employee,
        int      $year,
        float    $annualQuota,
        int      $minJours,
        int      $reportMax
    ): array {
        $dateRef      = Carbon::createFromDate($year, 12, 31)->endOfDay();
        $lastCalcDate = $employee->date_dernier_calcul_conge
            ? $employee->date_dernier_calcul_conge
            : $employee->hire_date;

        // Jours effectivement pris dans l'année clôturée
        $daysTaken = (float) Leave::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where('start_date', '>=', $lastCalcDate)
            ->where('start_date', '<=', $dateRef->format('Y-m-d'))
            ->sum('days_count');

        // Report antérieur et son expiration
        $prevCarry   = (float) ($employee->jours_reportes ?? 0);
        $expiryYear  = $employee->annee_expiration_report;

        // Suppléments individuels (bonus ancienneté, enfants, médaille)
        $seniority = $this->calculator->getSeniorityBonus($employee, $dateRef);
        $children  = $this->calculator->getChildrenBonus($employee, $dateRef);
        $medaille  = $this->calculator->getMedailleBonus($employee);

        // ── Allocation FIFO : l'ancien report est consommé en premier ──
        $usedFromCarry   = min($daysTaken, $prevCarry);
        $usedFromCurrent = max(0, $daysTaken - $prevCarry);
        $carryRemaining  = max(0, $prevCarry - $usedFromCarry);

        $currentYearTotal    = (float) $annualQuota + $seniority + $children + $medaille;
        $currentRemaining    = max(0, $currentYearTotal - $usedFromCurrent);

        // ── Expiration du report antérieur ──
        $carryExpired = $expiryYear !== null && (int) $expiryYear <= $year;
        $jExpires     = $carryExpired ? $carryRemaining : 0.0;
        if ($carryExpired) {
            $carryRemaining = 0.0;
        }

        $newCarry = $carryRemaining + $currentRemaining;

        // ── Année d'expiration du nouveau report ──
        // Si l'ancien report n'a pas encore expiré, on conserve son année d'expiration
        // (les jours du report le plus ancien fixent l'horloge).
        // Sinon, on initialise une nouvelle horloge à year + reportMax.
        if ($newCarry > 0) {
            if (!$carryExpired && $expiryYear !== null) {
                $newExpiration = (int) $expiryYear; // on garde la date la plus ancienne
            } else {
                $newExpiration = $year + $reportMax;
            }
        } else {
            $newExpiration = null;
        }

        return [
            'days_taken'        => $daysTaken,
            'prev_carry'        => $prevCarry,
            'expiry_year'       => $expiryYear,
            'carry_expired'     => $carryExpired,
            'j_expires'         => round($jExpires, 1),
            'current_year_total'=> round($currentYearTotal, 1),
            'current_remaining' => round($currentRemaining, 1),
            'carry_remaining'   => round($carryRemaining, 1),
            'new_carry'         => round($newCarry, 1),
            'new_expiration'    => $newExpiration,
            'min_ok'            => $daysTaken >= $minJours,
            'seniority'         => $seniority,
            'children'          => $children,
            'medaille'          => $medaille,
        ];
    }

    // ────────────────────────────────────────────────────────────────────────
    //  GET /leaves-carryover  — prévisualisation de la clôture annuelle
    // ────────────────────────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $year     = (int) ($request->year ?? Carbon::now()->year);
        $settings = LeaveSettings::get();
        $minJours = (int) $settings->min_jours_obligatoires;
        $reportMax= (int) $settings->report_annees_max;
        $quota    = (float) $settings->annual_quota;

        $employees = Employee::where('status', 'active')
            ->with('department')
            ->orderBy('last_name')
            ->get();

        $rows = $employees->map(function (Employee $emp) use ($year, $quota, $minJours, $reportMax) {
            $calc = $this->computeCarryover($emp, $year, $quota, $minJours, $reportMax);

            $alreadyApplied = LeaveCarryover::where('employee_id', $emp->id)
                ->where('year', $year)
                ->first();

            return [
                'employee_id'         => $emp->id,
                'employee_name'       => $emp->full_name,
                'employee_number'     => $emp->employee_number,
                'department'          => $emp->department?->name ?? '—',
                // Détail calcul
                'quota_annuel'        => $calc['current_year_total'],
                'jours_pris_annee'    => $calc['days_taken'],
                'min_jours_ok'        => $calc['min_ok'],
                'prev_carry'          => $calc['prev_carry'],
                'prev_carry_expire'   => $calc['expiry_year'],
                'carry_expired'       => $calc['carry_expired'],
                'j_expires'           => $calc['j_expires'],
                // Résultat
                'solde_disponible'    => round($calc['current_remaining'] + ($calc['carry_expired'] ? 0 : $calc['carry_remaining']), 1),
                'jours_a_reporter'    => $calc['new_carry'],
                'new_expiration'      => $calc['new_expiration'],
                // État
                'already_applied'     => $alreadyApplied !== null,
                'applied_at'          => $alreadyApplied?->applied_at,
                'jours_reportes'      => $alreadyApplied?->jours_reportes,
                // Anciens champs conservés pour compatibilité
                'plafond'             => 0,
            ];
        });

        $history = LeaveCarryover::with('employee.department', 'appliquePar')
            ->where('year', $year)
            ->orderBy('applied_at', 'desc')
            ->get();

        return response()->json([
            'year'                  => $year,
            'plafond'               => 0,
            'min_jours_obligatoires'=> $minJours,
            'report_annees_max'     => $reportMax,
            'rows'                  => $rows,
            'history'               => $history,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  POST /leaves-carryover/apply  — appliquer la clôture
    // ────────────────────────────────────────────────────────────────────────
    public function apply(Request $request)
    {
        $data = $request->validate([
            'year'           => ['required', 'integer', 'min:2020', 'max:2100'],
            'plafond'        => ['nullable', 'numeric', 'min:0', 'max:60'],
            'employee_ids'   => ['required', 'array', 'min:1'],
            'employee_ids.*' => ['integer', 'exists:employees,id'],
            'force_min'      => ['boolean'], // override minimum obligatoire (avec avertissement)
        ]);

        $year       = $data['year'];
        $forceMin   = (bool) ($data['force_min'] ?? false);
        $newYearStart = Carbon::createFromDate($year + 1, 1, 1);
        $userId     = $request->user()->id;
        $now        = now();

        $settings  = LeaveSettings::get();
        $minJours  = (int) $settings->min_jours_obligatoires;
        $reportMax = (int) $settings->report_annees_max;
        $quota     = (float) $settings->annual_quota;

        $applied  = [];
        $skipped  = [];
        $warnings = [];

        foreach ($data['employee_ids'] as $empId) {
            // Éviter les doublons
            if (LeaveCarryover::where('employee_id', $empId)->where('year', $year)->exists()) {
                $skipped[] = ['employee_id' => $empId, 'reason' => 'Déjà appliqué pour cette année.'];
                continue;
            }

            $employee = Employee::with(['children', 'department'])->findOrFail($empId);
            $calc     = $this->computeCarryover($employee, $year, $quota, $minJours, $reportMax);

            // ── Vérification minimum obligatoire ──
            if (! $calc['min_ok'] && ! $forceMin) {
                $skipped[] = [
                    'employee_id'  => $empId,
                    'employee_name'=> $employee->full_name,
                    'reason'       => "Minimum obligatoire non respecté : {$calc['days_taken']} j pris sur {$minJours} j requis.",
                ];
                continue;
            }

            if (! $calc['min_ok'] && $forceMin) {
                $warnings[] = [
                    'employee_id'  => $empId,
                    'employee_name'=> $employee->full_name,
                    'message'      => "Minimum obligatoire ({$minJours} j) forcé : {$calc['days_taken']} j pris.",
                ];
            }

            // ── Enregistrer la clôture ──
            $soldeFinAnnee = round(
                $calc['current_remaining'] + ($calc['carry_expired'] ? 0 : $calc['carry_remaining']),
                1
            );

            LeaveCarryover::create([
                'employee_id'            => $empId,
                'year'                   => $year,
                'solde_fin_annee'        => $soldeFinAnnee,
                'plafond'                => 0,
                'jours_reportes'         => $calc['new_carry'],
                'jours_pris_annee'       => $calc['days_taken'],
                'jours_reportes_expires' => $calc['j_expires'],
                'annee_expiration_report'=> $calc['new_expiration'],
                'min_jours_respecte'     => $calc['min_ok'],
                'applique_par'           => $userId,
                'applied_at'             => $now,
            ]);

            // ── Mettre à jour le solde de l'agent ──
            $employee->update([
                'nbre_jour_restant'          => $calc['new_carry'],
                'jours_reportes'             => $calc['new_carry'],
                'annee_expiration_report'    => $calc['new_expiration'],
                'date_dernier_calcul_conge'  => $newYearStart->format('Y-m-d'),
            ]);

            $applied[] = [
                'employee_id'    => $empId,
                'employee_name'  => $employee->full_name,
                'jours_reportes' => $calc['new_carry'],
                'j_expires'      => $calc['j_expires'],
                'expiration'     => $calc['new_expiration'],
            ];
        }

        return response()->json([
            'message'  => count($applied) . ' report(s) appliqué(s).',
            'applied'  => $applied,
            'skipped'  => $skipped,
            'warnings' => $warnings,
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
