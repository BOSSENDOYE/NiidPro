<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with('employee.department')
            ->when($request->employee_id, fn($q, $e) => $q->where('employee_id', $e))
            ->when($request->date, fn($q, $d) => $q->whereDate('date', $d))
            ->when($request->from, fn($q, $d) => $q->whereDate('date', '>=', $d))
            ->when($request->to, fn($q, $d) => $q->whereDate('date', '<=', $d))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->department_id, fn($q, $d) =>
                $q->whereHas('employee', fn($eq) => $eq->where('department_id', $d))
            );

        return response()->json($query->orderByDesc('date')->paginate(20));
    }

    public function today(Request $request)
    {
        $today = Carbon::today();
        $attendances = Attendance::with('employee.department')
            ->whereDate('date', $today)
            ->when($request->department_id, fn($q, $d) =>
                $q->whereHas('employee', fn($eq) => $eq->where('department_id', $d))
            )
            ->get();

        $employees = Employee::where('status', 'active')->count();

        return response()->json([
            'date'     => $today->toDateString(),
            'total'    => $employees,
            'present'  => $attendances->where('status', 'present')->count(),
            'absent'   => $attendances->where('status', 'absent')->count(),
            'late'     => $attendances->where('status', 'late')->count(),
            'on_leave' => $attendances->where('status', 'on_leave')->count(),
            'records'  => $attendances,
        ]);
    }

    public function checkIn(Request $request)
    {
        $request->validate(['employee_id' => ['required', 'exists:employees,id']]);

        $today = Carbon::today();
        $attendance = Attendance::firstOrCreate(
            ['employee_id' => $request->employee_id, 'date' => $today],
            ['status' => 'present', 'source' => $request->source ?? 'web', 'recorded_by' => $request->user()->id]
        );

        if ($attendance->check_in) {
            return response()->json(['message' => 'Déjà pointé ce matin.'], 422);
        }

        $attendance->update([
            'check_in'  => now(),
            'status'    => Carbon::now()->hour >= 9 ? 'late' : 'present',
        ]);

        return response()->json($attendance->fresh()->load('employee'));
    }

    public function checkOut(Request $request)
    {
        $request->validate(['employee_id' => ['required', 'exists:employees,id']]);

        $attendance = Attendance::where('employee_id', $request->employee_id)
            ->whereDate('date', Carbon::today())
            ->first();

        if (!$attendance || !$attendance->check_in) {
            return response()->json(['message' => 'Aucun pointage d\'entrée trouvé.'], 422);
        }

        $checkOut     = now();
        $workedMinutes = (int) $attendance->check_in->diffInMinutes($checkOut);

        $attendance->update([
            'check_out'      => $checkOut,
            'worked_minutes' => $workedMinutes,
            'overtime_minutes' => max(0, $workedMinutes - 480), // >8h
        ]);

        return response()->json($attendance->fresh()->load('employee'));
    }

    /**
     * Badgeage manuel par un admin pour un agent (entrée ou sortie).
     * Payload: { employee_number, action: 'in'|'out', notes? }
     */
    public function badge(Request $request)
    {
        $data = $request->validate([
            'employee_number' => ['required', 'string', 'exists:employees,employee_number'],
            'action'          => ['required', 'in:in,out'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $employee = Employee::where('employee_number', $data['employee_number'])->firstOrFail();
        $today    = Carbon::today();

        $attendance = Attendance::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => $today],
            [
                'status'      => 'present',
                'source'      => 'badge',
                'recorded_by' => $request->user()->id,
            ]
        );

        if ($data['action'] === 'in') {
            if ($attendance->check_in) {
                return response()->json(['message' => 'Entrée déjà enregistrée aujourd\'hui.'], 422);
            }
            $attendance->update([
                'check_in' => now(),
                'status'   => Carbon::now()->hour >= 9 ? 'late' : 'present',
                'notes'    => $data['notes'] ?? $attendance->notes,
            ]);
        } else {
            if (!$attendance->check_in) {
                return response()->json(['message' => 'Aucune entrée enregistrée aujourd\'hui.'], 422);
            }
            if ($attendance->check_out) {
                return response()->json(['message' => 'Sortie déjà enregistrée aujourd\'hui.'], 422);
            }
            $checkOut      = now();
            $workedMinutes = (int) $attendance->check_in->diffInMinutes($checkOut);
            $attendance->update([
                'check_out'        => $checkOut,
                'worked_minutes'   => $workedMinutes,
                'overtime_minutes' => max(0, $workedMinutes - 480),
                'notes'            => $data['notes'] ?? $attendance->notes,
            ]);
        }

        return response()->json($attendance->fresh()->load('employee'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'date'        => ['required', 'date'],
            'status'      => ['required', 'in:present,absent,late,half_day,on_leave,holiday'],
            'check_in'    => ['nullable', 'date_format:H:i'],
            'check_out'   => ['nullable', 'date_format:H:i'],
            'notes'       => ['nullable', 'string'],
        ]);

        $data['source']      = 'manual';
        $data['recorded_by'] = $request->user()->id;

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'date' => $data['date']],
            $data
        );

        return response()->json($attendance->load('employee'), 201);
    }
}
