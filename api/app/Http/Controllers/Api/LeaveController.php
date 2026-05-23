<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Models\LeaveType;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function index(Request $request)
    {
        $query = Leave::with(['employee.department', 'leaveType', 'approver'])
            ->when($request->employee_id, fn($q, $e) => $q->where('employee_id', $e))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->leave_type_id, fn($q, $t) => $q->where('leave_type_id', $t))
            ->when($request->from, fn($q, $d) => $q->whereDate('start_date', '>=', $d))
            ->when($request->to, fn($q, $d) => $q->whereDate('end_date', '<=', $d))
            ->when($request->department_id, fn($q, $d) =>
                $q->whereHas('employee', fn($eq) => $eq->where('department_id', $d))
            );

        return response()->json($query->orderByDesc('created_at')->paginate(15));
    }

    public function pending()
    {
        $leaves = Leave::with(['employee.department', 'leaveType'])
            ->where('status', 'pending')
            ->orderBy('start_date')
            ->get();

        return response()->json($leaves);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id'   => ['required', 'exists:employees,id'],
            'leave_type_id' => ['required', 'exists:leave_types,id'],
            'start_date'    => ['required', 'date', 'after_or_equal:today'],
            'end_date'      => ['required', 'date', 'after_or_equal:start_date'],
            'reason'        => ['nullable', 'string'],
        ]);

        // Calculate working days
        $data['days_count'] = $this->calculateWorkingDays($data['start_date'], $data['end_date']);
        $data['status']     = 'pending';

        // Check for overlapping leaves
        $overlap = Leave::where('employee_id', $data['employee_id'])
            ->where('status', '!=', 'rejected')
            ->where('status', '!=', 'cancelled')
            ->where(fn($q) =>
                $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                  ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']])
            )->exists();

        if ($overlap) {
            return response()->json(['message' => 'Chevauchement avec une demande existante.'], 422);
        }

        $leave = Leave::create($data);

        return response()->json($leave->load(['employee', 'leaveType']), 201);
    }

    public function show(Leave $leave)
    {
        return response()->json($leave->load(['employee.department', 'leaveType', 'approver']));
    }

    public function approve(Request $request, Leave $leave)
    {
        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Cette demande ne peut plus être approuvée.'], 422);
        }

        $leave->update([
            'status'      => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json($leave->fresh()->load(['employee', 'leaveType', 'approver']));
    }

    public function reject(Request $request, Leave $leave)
    {
        $request->validate(['rejection_reason' => ['required', 'string']]);

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Cette demande ne peut plus être rejetée.'], 422);
        }

        $leave->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'approved_by'      => $request->user()->id,
            'approved_at'      => now(),
        ]);

        return response()->json($leave->fresh()->load(['employee', 'leaveType']));
    }

    public function destroy(Leave $leave)
    {
        if (!in_array($leave->status, ['pending', 'cancelled'])) {
            return response()->json(['message' => 'Impossible de supprimer cette demande.'], 422);
        }
        $leave->delete();
        return response()->json(['message' => 'Demande supprimée.']);
    }

    public function types()
    {
        return response()->json(LeaveType::where('is_active', true)->get());
    }

    private function calculateWorkingDays(string $start, string $end): int
    {
        $current = new \DateTime($start);
        $endDate = new \DateTime($end);
        $days    = 0;

        while ($current <= $endDate) {
            if (!in_array($current->format('N'), [6, 7])) {
                $days++;
            }
            $current->modify('+1 day');
        }

        return max(1, $days);
    }
}
