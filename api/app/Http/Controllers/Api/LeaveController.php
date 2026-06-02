<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveType;
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
        $query = Leave::with(['employee.department', 'leaveType', 'approver'])
            ->when($request->employee_id,   fn($q, $e) => $q->where('employee_id', $e))
            ->when($request->status,        fn($q, $s) => $q->where('status', $s))
            ->when($request->leave_type_id, fn($q, $t) => $q->where('leave_type_id', $t))
            ->when($request->from,          fn($q, $d) => $q->whereDate('start_date', '>=', $d))
            ->when($request->to,            fn($q, $d) => $q->whereDate('end_date', '<=', $d))
            ->when($request->department_id, fn($q, $d) =>
                $q->whereHas('employee', fn($eq) => $eq->where('department_id', $d))
            );

        return response()->json($query->orderByDesc('created_at')->paginate(15));
    }

    // ─── Congés en attente ──────────────────────────────────────────
    public function pending()
    {
        $leaves = Leave::with(['employee.department', 'leaveType'])
            ->where('status', 'pending')
            ->orderBy('start_date')
            ->get();

        return response()->json($leaves);
    }

    // ─── Créer une demande ──────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id'   => ['required', 'exists:employees,id'],
            'leave_type_id' => ['required', 'exists:leave_types,id'],
            'start_date'    => ['required', 'date'],
            'end_date'      => ['required', 'date', 'after_or_equal:start_date'],
            'reason'        => ['nullable', 'string'],
        ]);

        $employee  = Employee::findOrFail($data['employee_id']);
        $leaveType = LeaveType::findOrFail($data['leave_type_id']);

        // ── Règle vendredi : décaler la date de début ──
        $originalStart = $data['start_date'];
        $fridayRule    = false;
        $startCarbon   = Carbon::parse($data['start_date']);

        if ($startCarbon->dayOfWeek === Carbon::FRIDAY) {
            $fridayRule         = true;
            $data['start_date'] = $this->calculator->adjustStartDate($startCarbon)->format('Y-m-d');
        }

        // ── Calcul des jours (exclure dimanches + fériés) ──
        $daysCount = $this->calculator->calculateLeaveDays(
            $data['start_date'],
            $data['end_date'],
            false // déjà ajusté ci-dessus
        );

        // ── Validation règles métier ──
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
            'employee_id'         => $data['employee_id'],
            'leave_type_id'       => $data['leave_type_id'],
            'start_date'          => $data['start_date'],
            'end_date'            => $data['end_date'],
            'days_count'          => $daysCount,
            'status'              => 'pending',
            'reason'              => $data['reason'] ?? null,
            'friday_rule_applied' => $fridayRule,
            'original_start_date' => $fridayRule ? $originalStart : null,
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

        // ── Déduire du solde de l'agent ──
        $employee = $leave->employee;
        $this->calculator->deductBalance($employee, $leave->days_count);

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
            'start_date' => ['required', 'date'],
            'end_date'   => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        $start    = Carbon::parse($request->start_date);
        $adjusted = $this->calculator->adjustStartDate($start);
        $days     = $this->calculator->calculateLeaveDays($request->start_date, $request->end_date);

        return response()->json([
            'original_start' => $request->start_date,
            'adjusted_start' => $adjusted->format('Y-m-d'),
            'end_date'       => $request->end_date,
            'working_days'   => $days,
            'friday_rule'    => $start->dayOfWeek === Carbon::FRIDAY,
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
            ->paginate(25);

        return response()->json($plannings);
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
