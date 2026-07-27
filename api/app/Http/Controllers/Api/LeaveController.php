<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\WorkflowConfig;
use App\Services\LeaveCalculationService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function __construct(private LeaveCalculationService $calculator)
    {}

    // ─── Liste avec filtres ─────────────────────────────────────────
    public function index(Request $request)
    {
        $query = Leave::with(['employee.department', 'employee.organisationUnit', 'leaveType', 'approver'])
            ->when($request->employee_id,   fn($q, $e) => $q->where('employee_id', $e))
            ->when($request->status,        fn($q, $s) => $q->where('status', $s))
            ->when($request->leave_type_id, fn($q, $t) => $q->where('leave_type_id', $t))
            ->when($request->from,          fn($q, $d) => $q->whereDate('start_date', '>=', $d))
            ->when($request->to,            fn($q, $d) => $q->whereDate('end_date', '<=', $d))
            ->when($request->department_id, fn($q, $d) =>
                $q->whereHas('employee', fn($eq) => $eq->where('department_id', $d))
            )
            ->when($request->category, fn($q, $cat) =>
                $q->whereHas('leaveType', fn($tq) => $tq->where('category', $cat))
            );

        $perPage = min((int) $request->get('per_page', 15), 500);

        return response()->json($query->orderByDesc('created_at')->paginate($perPage));
    }

    // ─── Congés en attente ──────────────────────────────────────────
    public function pending()
    {
        $leaves = Leave::with(['employee.department', 'employee.organisationUnit', 'leaveType'])
            ->where('status', 'pending')
            ->orderBy('start_date')
            ->get();

        return response()->json($leaves);
    }

    // ─── Congés approuvés se terminant bientôt (reprises imminentes) ──
    public function endingSoon(Request $request)
    {
        $days  = max(1, min(30, (int) ($request->get('days', 3))));
        $today = Carbon::today();
        $limit = Carbon::today()->addDays($days);

        $leaves = Leave::with(['employee.department', 'employee.organisationUnit', 'leaveType'])
            ->where('status', 'approved')
            ->whereDate('end_date', '>=', $today)
            ->whereDate('end_date', '<=', $limit)
            ->orderBy('end_date')
            ->get()
            ->map(function ($leave) use ($today) {
                $endDate = Carbon::parse($leave->end_date);
                $leave->days_until_return = $today->diffInDays($endDate, false);
                return $leave;
            });

        return response()->json($leaves);
    }

    // ─── Créer une demande ──────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id'           => ['required', 'exists:employees,id'],
            'leave_type_id'         => ['required', 'exists:leave_types,id'],
            'start_date'            => ['required', 'date'],
            'end_date'              => ['required', 'date', 'after_or_equal:start_date'],
            'reason'                => ['nullable', 'string'],
            'leave_decision_ref'    => ['nullable', 'string', 'max:100'],
            'leave_decision_avenir' => ['nullable', 'boolean'],
            'abs_imputation'        => ['nullable', 'string', 'in:absence_quota,conge_quota,none'],
        ]);

        $employee  = Employee::findOrFail($data['employee_id']);
        $leaveType = LeaveType::findOrFail($data['leave_type_id']);
        $isAbsence = ($leaveType->category ?? '') === 'absence';

        // ── Règle vendredi : s'applique aux congés uniquement ──
        $originalStart = $data['start_date'];
        $fridayRule    = false;
        $startCarbon   = Carbon::parse($data['start_date']);

        if (! $isAbsence && $startCarbon->dayOfWeek === Carbon::FRIDAY) {
            $fridayRule         = true;
            $data['start_date'] = $this->calculator->adjustStartDate($startCarbon)->format('Y-m-d');
        }

        // ── Calcul des jours (exclure dimanches + fériés, samedis ouvrés) ──
        $daysCount = $this->calculator->calculateLeaveDays(
            $data['start_date'],
            $data['end_date'],
            false // déjà ajusté ci-dessus
        );

        if ($isAbsence) {
            $isAutreType = ($leaveType->code === 'ABS_AUTRE');
            $imputation  = $data['abs_imputation'] ?? null;

            if (! $isAutreType || $imputation === 'absence_quota') {
                // Limite annuelle absences : 15 jours ouvrées
                $year            = now()->year;
                $usedAbsenceDays = Leave::where('employee_id', $data['employee_id'])
                    ->whereNotIn('status', ['rejected', 'cancelled'])
                    ->whereHas('leaveType', fn($q) => $q->where('category', 'absence'))
                    ->whereYear('start_date', $year)
                    ->sum('days_count');

                if ($usedAbsenceDays + $daysCount > 15) {
                    $remaining = max(0, 15 - (int) $usedAbsenceDays);
                    return response()->json([
                        'message' => "Quota d'absences annuel dépassé. Jours restants : {$remaining}/15.",
                        'errors'  => ['days' => ["Quota d'absences annuel de 15 jours dépassé."]],
                    ], 422);
                }
            } elseif ($imputation === 'conge_quota') {
                // ABS_AUTRE imputé sur le solde de congés : vérifier le solde
                $validation = $this->calculator->validateLeaveRequest(
                    $employee,
                    $data['start_date'],
                    $data['end_date'],
                    $daysCount
                );

                if (! $validation['valid']) {
                    return response()->json([
                        'message' => implode(' ', $validation['errors']),
                        'errors'  => ['days' => $validation['errors']],
                        'balance' => $validation['balance'],
                    ], 422);
                }
            }
            // ABS_AUTRE sans imputation configurée → aucune vérification (appréciation RH)
        } else {
            // ── Validation règles métier congés ──
            $validation = $this->calculator->validateLeaveRequest(
                $employee,
                $data['start_date'],
                $data['end_date'],
                $daysCount
            );

            if (! $validation['valid']) {
                return response()->json([
                    'message' => implode(' ', $validation['errors']),
                    'errors'  => ['days' => $validation['errors']],
                    'balance' => $validation['balance'],
                ], 422);
            }
        }

        // ── Vérifier chevauchement ──
        $overlap = Leave::where('employee_id', $data['employee_id'])
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->where(fn($q) =>
                $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                  ->orWhereBetween('end_date',  [$data['start_date'], $data['end_date']])
                  ->orWhere(fn($q2) =>
                      $q2->where('start_date', '<=', $data['start_date'])
                         ->where('end_date',   '>=', $data['end_date'])
                  )
            )->exists();

        if ($overlap) {
            return response()->json(['message' => 'Chevauchement avec une demande existante.'], 422);
        }

        $leave = Leave::create([
            'employee_id'           => $data['employee_id'],
            'leave_type_id'         => $data['leave_type_id'],
            'start_date'            => $data['start_date'],
            'end_date'              => $data['end_date'],
            'days_count'            => $daysCount,
            'status'                => 'pending',
            'reason'                => $data['reason'] ?? null,
            'leave_decision_ref'    => $data['leave_decision_ref'] ?? null,
            'leave_decision_avenir' => $data['leave_decision_avenir'] ?? false,
            'abs_imputation'        => $data['abs_imputation'] ?? null,
            'friday_rule_applied'   => $fridayRule,
            'original_start_date'   => $fridayRule ? $originalStart : null,
        ]);

        return response()->json($leave->load(['employee', 'leaveType']), 201);
    }

    public function show(Leave $leave)
    {
        return response()->json($leave->load(['employee.department', 'leaveType', 'approver']));
    }

    // ─── Approuver ─────────────────────────────────────────────────
    public function approve(Request $request, Leave $leave)
    {
        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Cette demande ne peut plus être approuvée.'], 422);
        }

        $leaveType = $leave->leaveType;
        $now       = now();

        $updates = [
            'status'      => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => $now,
            'comment'     => $request->comment,
        ];

        // Règle 48h pour congé maladie
        if ($leaveType && str_contains(strtolower($leaveType->code ?? ''), 'mal')) {
            $updates['justification_deadline'] = $now->copy()->addHours(48);
        }

        $leave->update($updates);

        return response()->json($leave->fresh()->load(['employee', 'leaveType', 'approver']));
    }

    // ─── Refuser ────────────────────────────────────────────────────
    public function reject(Request $request, Leave $leave)
    {
        $request->validate(['comment' => ['nullable', 'string']]);

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Cette demande ne peut plus être rejetée.'], 422);
        }

        $leave->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'comment'          => $request->comment,
            'approved_by'      => $request->user()->id,
            'approved_at'      => now(),
        ]);

        return response()->json($leave->fresh()->load(['employee', 'leaveType']));
    }

    // ─── Workflow multi-niveaux (toutes catégories configurées) ───
    public function approveLevel(Request $request, Leave $leave): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'action'  => ['required', 'in:approve,reject'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Cette demande ne peut plus être traitée.'], 422);
        }

        $category    = $leave->leaveType?->category ?? 'conge';
        $activeLevels = WorkflowConfig::activeFor($category);

        if ($activeLevels->isEmpty()) {
            return response()->json(['message' => 'Aucun circuit de validation configuré pour ce type.'], 422);
        }

        $currentLevel    = (int) ($leave->abs_approval_level ?? 0);
        $nextLevelConfig = $activeLevels->first(fn($l) => $l->level > $currentLevel);

        if (! $nextLevelConfig) {
            return response()->json(['message' => 'Tous les niveaux ont déjà été traités.'], 422);
        }

        $approvals   = $leave->abs_approvals ?? [];
        $approvals[] = [
            'level'   => $nextLevelConfig->level,
            'label'   => $nextLevelConfig->label,
            'status'  => $validated['action'] === 'approve' ? 'approved' : 'rejected',
            'comment' => $validated['comment'] ?? null,
            'at'      => now()->toDateTimeString(),
            'by'      => $request->user()?->name ?? 'Administrateur',
        ];

        $updates = [
            'abs_approvals'      => $approvals,
            'abs_approval_level' => $nextLevelConfig->level,
        ];

        if ($validated['action'] === 'reject') {
            $updates['status']           = 'rejected';
            $updates['rejection_reason'] = $validated['comment'];
            $updates['approved_by']      = $request->user()?->id;
            $updates['approved_at']      = now();
        } elseif ($activeLevels->last()->level === $nextLevelConfig->level) {
            // Dernier niveau actif → approbation finale
            $updates['status']      = 'approved';
            $updates['approved_by'] = $request->user()?->id;
            $updates['approved_at'] = now();

        }

        $leave->update($updates);

        return response()->json($leave->fresh(['employee', 'leaveType']));
    }

    // ─── Annuler ────────────────────────────────────────────────────
    public function destroy(Leave $leave)
    {
        if (! in_array($leave->status, ['pending', 'cancelled'])) {
            return response()->json(['message' => 'Impossible de supprimer cette demande.'], 422);
        }

        // Si le congé était approuvé, recréditer le solde
        if ($leave->status === 'approved') {
            $this->calculator->restoreBalance($leave->employee, $leave->days_count);
        }

        $leave->delete();
        return response()->json(['message' => 'Demande supprimée.']);
    }

    // ─── Types de congés actifs ─────────────────────────────────────
    public function types()
    {
        return response()->json(LeaveType::where('is_active', true)->get());
    }

    // ─── Solde d'un agent ───────────────────────────────────────────
    public function balance(Employee $employee)
    {
        return response()->json($this->calculator->getBalance($employee));
    }

    // ─── Calculer les jours pour une période ────────────────────────
    public function calculateDays(Request $request)
    {
        $request->validate([
            'start_date'        => ['required', 'date'],
            'end_date'          => ['required', 'date', 'after_or_equal:start_date'],
            'apply_friday_rule' => ['nullable', 'boolean'],
        ]);

        $applyFridayRule = $request->boolean('apply_friday_rule', true);
        $start    = Carbon::parse($request->start_date);
        $adjusted = $applyFridayRule ? $this->calculator->adjustStartDate($start) : $start;
        $days     = $this->calculator->calculateLeaveDays($request->start_date, $request->end_date, $applyFridayRule);

        return response()->json([
            'original_start' => $request->start_date,
            'adjusted_start' => $adjusted->format('Y-m-d'),
            'end_date'       => $request->end_date,
            'working_days'   => $days,
            'friday_rule'    => $applyFridayRule && $start->dayOfWeek === Carbon::FRIDAY,
        ]);
    }

    // ─── Calculer la date de fin depuis durée + date début ──────────
    public function calculateEndDate(Request $request)
    {
        $request->validate([
            'start_date' => ['required', 'date'],
            'duration'   => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        $duration       = (int) $request->duration;
        $start          = Carbon::parse($request->start_date);
        $upperBound     = $start->copy()->addDays($duration * 3 + 30);
        $holidays       = $this->calculator->getHolidaysInRange($start->format('Y-m-d'), $upperBound->format('Y-m-d'));
        $samediOuvrable = (bool) config('leaves.samedi_ouvrable', true);

        $count   = 0;
        $current = $start->copy();

        while ($current->lte($upperBound)) {
            $isSunday  = $current->dayOfWeek === Carbon::SUNDAY;
            $isSat     = $current->dayOfWeek === Carbon::SATURDAY;
            $isHoliday = in_array($current->format('Y-m-d'), $holidays);

            if (! $isSunday && ! $isHoliday && ! ($isSat && ! $samediOuvrable)) {
                $count++;
                if ($count >= $duration) {
                    break;
                }
            }
            $current->addDay();
        }

        return response()->json([
            'start_date' => $request->start_date,
            'end_date'   => $current->format('Y-m-d'),
            'duration'   => $duration,
        ]);
    }

    // ─── Jours fériés ───────────────────────────────────────────────
    public function holidays(Request $request)
    {
        $year     = (int) ($request->year ?? date('Y'));
        $from     = "{$year}-01-01";
        $to       = "{$year}-12-31";
        $holidays = $this->calculator->getHolidaysInRange($from, $to);

        $result = \App\Models\JourFerie::all()->map(function ($f) use ($year, $holidays) {
            $date = $f->is_recurring
                ? \Carbon\Carbon::createFromDate($year, $f->mois, $f->jour)->format('Y-m-d')
                : \Carbon\Carbon::parse($f->date)->format('Y-m-d');

            return ['id' => $f->id, 'libelle' => $f->libelle, 'date' => $date, 'recurring' => $f->is_recurring];
        })->filter(fn($h) => $h['date'] >= "{$year}-01-01" && $h['date'] <= "{$year}-12-31")
          ->sortBy('date')
          ->values();

        return response()->json($result);
    }

    // ─── Générer le planning (API) ───────────────────────────────────
    public function generatePlanning(Request $request)
    {
        $data = $request->validate([
            'critere'         => ['required', 'in:G,E,A'],
            'annee'           => ['required', 'integer', 'min:2020', 'max:2100'],
            'date_generation' => ['nullable', 'date'],
            'date_limite'     => ['nullable', 'date'],
            'department_id'   => ['nullable', 'exists:departments,id'],
            'employee_id'     => ['nullable', 'exists:employees,id'],
        ]);

        $dateGen    = isset($data['date_generation']) ? Carbon::parse($data['date_generation']) : Carbon::today();
        $dateLimite = isset($data['date_limite'])     ? Carbon::parse($data['date_limite'])    : Carbon::createFromDate($data['annee'], 10, 31);

        $query = Employee::where('status', 'active');

        if ($data['critere'] === 'E' && ! empty($data['department_id'])) {
            $query->where('department_id', $data['department_id']);
        } elseif ($data['critere'] === 'A' && ! empty($data['employee_id'])) {
            $query->where('id', $data['employee_id']);
        }

        $employees = $query->get();
        $results   = [];

        foreach ($employees as $employee) {
            $planning  = $this->calculator->generatePlanningForEmployee(
                $employee,
                $data['annee'],
                $dateGen,
                $dateLimite,
                $request->user()->id,
                $data['critere']
            );
            $results[] = $planning->load('employee.department');
        }

        return response()->json([
            'message'   => count($results) . ' planning(s) généré(s).',
            'generated' => count($results),
            'plannings' => $results,
        ]);
    }

    // ─── Liste plannings ────────────────────────────────────────────
    public function plannings(Request $request)
    {
        $plannings = \App\Models\DetailPlanningConge::with('employee.department')
            ->when($request->annee,         fn($q, $a) => $q->where('annee', $a))
            ->when($request->employee_id,   fn($q, $e) => $q->where('employee_id', $e))
            ->when($request->department_id, fn($q, $d) =>
                $q->whereHas('employee', fn($eq) => $eq->where('department_id', $d))
            )
            ->orderByDesc('date_generation')
            ->paginate(200);

        return response()->json($plannings);
    }

    // ─── Plannings à départ imminent ────────────────────────────────
    public function planningUpcoming(Request $request)
    {
        $days  = max(1, min(60, (int) ($request->get('days', 14))));
        $today = Carbon::today();
        $limit = Carbon::today()->addDays($days);

        $plannings = \App\Models\DetailPlanningConge::with(['employee.department', 'employee.organisationUnit'])
            ->whereNotNull('date_depart_prevu')
            ->whereDate('date_depart_prevu', '>=', $today)
            ->whereDate('date_depart_prevu', '<=', $limit)
            ->whereNotIn('statut_realisation', ['réalisé', 'non_respecté'])
            ->orderBy('date_depart_prevu')
            ->get()
            ->map(function ($planning) use ($today) {
                $depart = Carbon::parse($planning->date_depart_prevu);
                $planning->days_until_depart = (int) $today->diffInDays($depart, false);
                return $planning;
            });

        return response()->json($plannings);
    }

    // ─── Mettre à jour les dates d'un planning ──────────────────────
    public function planningUpdateDates(Request $request, int $id)
    {
        $planning = \App\Models\DetailPlanningConge::findOrFail($id);

        $data = $request->validate([
            'date_depart_prevu'    => ['nullable', 'date'],
            'date_retour_prevu'    => ['nullable', 'date', 'after_or_equal:date_depart_prevu'],
            'nbre_jours_programme' => ['nullable', 'numeric', 'min:1', 'max:90'],
            'statut_realisation'   => ['nullable', 'in:planifié,confirmé,réalisé,non_respecté'],
            'leave_id'             => ['nullable', 'exists:leaves,id'],
        ]);

        $planning->update($data);

        return response()->json($planning->load('employee.department'));
    }

    // ─── Soumettre un justificatif médical ──────────────────────────
    public function submitJustification(Request $request, Leave $leave)
    {
        if (! $leave->justification_deadline) {
            return response()->json(['message' => 'Aucune obligation de justificatif pour ce congé.'], 422);
        }

        if ($leave->justification_submitted_at) {
            return response()->json(['message' => 'Justificatif déjà soumis.'], 422);
        }

        $submittedAt = now();
        $onTime      = $submittedAt->lte($leave->justification_deadline);

        $leave->update(['justification_submitted_at' => $submittedAt]);

        return response()->json([
            'message'     => $onTime ? 'Justificatif enregistré dans les délais.' : 'Justificatif enregistré hors délai.',
            'on_time'     => $onTime,
            'submitted_at'=> $submittedAt->format('Y-m-d H:i'),
            'deadline'    => $leave->justification_deadline?->format('Y-m-d H:i'),
        ]);
    }
}
