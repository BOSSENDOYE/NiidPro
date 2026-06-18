<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\CompanySetting;
use App\Models\Employee;
use App\Models\GeneratedDocument;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MeController extends Controller
{
    /** L'employé lié au compte connecté (403 si non rattaché). */
    private function employee(Request $request): Employee
    {
        $employee = $request->user()?->employee;
        abort_unless($employee, 403, "Votre compte n'est rattaché à aucun agent. Contactez l'administrateur RH.");
        return $employee;
    }

    // ── Dossier ──────────────────────────────────────────────────────────────
    public function profile(Request $request)
    {
        $employee = $this->employee($request)->load([
            'department', 'position', 'manager', 'familyMembers',
            'contracts' => fn ($q) => $q->latest('start_date'),
        ]);

        return response()->json($employee);
    }

    /** Mise à jour par l'agent de ses propres informations personnelles (champs non sensibles). */
    public function updateProfile(Request $request)
    {
        $employee = $this->employee($request);

        $data = $request->validate([
            'personal_email'     => ['nullable', 'email', 'max:255'],
            'phone_personal'     => ['nullable', 'string', 'max:50'],
            'phone_professional' => ['nullable', 'string', 'max:50'],
            'address'            => ['nullable', 'string', 'max:500'],
            'city'               => ['nullable', 'string', 'max:255'],
            'postal_code'        => ['nullable', 'string', 'max:30'],
            'country'            => ['nullable', 'string', 'max:255'],
            'birth_place'        => ['nullable', 'string', 'max:255'],
            'nationality'        => ['nullable', 'string', 'max:255'],
            'bank_account'       => ['nullable', 'string', 'max:255'],
            'national_id'        => ['nullable', 'string', 'max:255'],
        ]);

        $employee->update($data);

        return response()->json($employee->fresh()->load(['department', 'position', 'manager']));
    }

    // ── Congés ───────────────────────────────────────────────────────────────
    public function leaves(Request $request)
    {
        $employee = $this->employee($request);
        $leaves = $employee->leaves()->with('leaveType')->latest('start_date')->get();
        return response()->json($leaves);
    }

    public function leaveBalance(Request $request)
    {
        $employee = $this->employee($request);
        return app(LeaveController::class)->balance($employee);
    }

    public function storeLeave(Request $request)
    {
        $employee = $this->employee($request);
        $request->merge(['employee_id' => $employee->id]);
        return app(LeaveController::class)->store($request);
    }

    // ── Pointages ────────────────────────────────────────────────────────────
    public function attendances(Request $request)
    {
        $employee = $this->employee($request);
        $list = $employee->attendances()->orderByDesc('date')->limit(60)->get();

        $today = $employee->attendances()->whereDate('date', Carbon::today())->first();

        return response()->json([
            'today'   => $today,
            'history' => $list,
        ]);
    }

    public function checkIn(Request $request)
    {
        return $this->punch($request, 'in');
    }

    public function checkOut(Request $request)
    {
        return $this->punch($request, 'out');
    }

    private function punch(Request $request, string $action)
    {
        $employee = $this->employee($request);
        $data = $request->validate([
            'latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        // ── Geofence ──
        $company = CompanySetting::current();
        $distance = null;
        if ($company->latitude !== null && $company->longitude !== null
            && isset($data['latitude'], $data['longitude'])) {
            $distance = $this->haversine(
                (float) $company->latitude, (float) $company->longitude,
                (float) $data['latitude'], (float) $data['longitude'],
            );
            $radius = (int) ($company->pointage_radius ?? 200);
            if ($distance > $radius) {
                return response()->json([
                    'message'  => "Vous êtes trop loin du siège pour pointer (≈ {$distance} m, limite {$radius} m).",
                    'distance' => $distance,
                    'radius'   => $radius,
                ], 422);
            }
        } elseif ($company->latitude !== null && $company->longitude !== null && $action === 'in') {
            return response()->json([
                'message' => "Position GPS requise pour pointer. Activez la localisation.",
            ], 422);
        }

        $today = Carbon::today();
        $attendance = Attendance::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => $today],
            ['status' => 'present', 'source' => 'mobile', 'recorded_by' => $request->user()->id],
        );

        if ($action === 'in') {
            if ($attendance->check_in) {
                return response()->json(['message' => 'Vous avez déjà pointé votre arrivée.'], 422);
            }
            $attendance->update([
                'check_in'        => now(),
                'status'          => Carbon::now()->hour >= 9 ? 'late' : 'present',
                'latitude'        => $data['latitude']  ?? null,
                'longitude'       => $data['longitude'] ?? null,
                'distance_metres' => $distance,
            ]);
        } else {
            if (!$attendance->check_in) {
                return response()->json(['message' => "Aucun pointage d'arrivée trouvé aujourd'hui."], 422);
            }
            if ($attendance->check_out) {
                return response()->json(['message' => 'Vous avez déjà pointé votre départ.'], 422);
            }
            $worked = (int) $attendance->check_in->diffInMinutes(now());
            $attendance->update([
                'check_out'        => now(),
                'worked_minutes'   => $worked,
                'overtime_minutes' => max(0, $worked - 480),
            ]);
        }

        return response()->json($attendance->fresh());
    }

    // ── Tâches ───────────────────────────────────────────────────────────────
    public function tasks(Request $request)
    {
        $employee = $this->employee($request);
        $tasks = Task::where('assigned_to', $employee->id)
            ->with('creator:id,name')
            ->orderByRaw("FIELD(status,'in_progress','todo','done','cancelled')")
            ->orderByDesc('created_at')
            ->get();
        return response()->json($tasks);
    }

    public function updateTaskStatus(Request $request, Task $task)
    {
        $employee = $this->employee($request);
        abort_unless($task->assigned_to === $employee->id, 403, "Cette tâche ne vous est pas affectée.");

        $data = $request->validate([
            'status' => ['required', 'in:todo,in_progress,done,cancelled'],
        ]);
        $task->update(['status' => $data['status']]);

        return response()->json($task->fresh());
    }

    // ── Documents ────────────────────────────────────────────────────────────
    public function documents(Request $request)
    {
        $employee = $this->employee($request);
        $docs = GeneratedDocument::where('employee_id', $employee->id)
            ->with('template:id,name,type')
            ->latest('created_at')
            ->get()
            ->map(fn (GeneratedDocument $d) => [
                'id'         => $d->id,
                'reference'  => $d->reference,
                'type'       => $d->type,
                'title'      => $d->template?->name ?? $d->type,
                'created_at' => $d->created_at,
            ]);
        return response()->json($docs);
    }

    /** Distance en mètres entre deux points GPS (Haversine). */
    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $earth = 6371000; // m
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return (int) round($earth * 2 * atan2(sqrt($a), sqrt(1 - $a)));
    }
}
