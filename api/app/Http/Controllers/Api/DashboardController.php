<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Contract;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\Justification;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();

        // Pointage du jour
        $todayAttendances = Attendance::whereDate('date', $today)->get();
        $activeEmployees  = Employee::where('status', 'active')->count();

        // Congés en attente
        $pendingLeaves  = Leave::where('status', 'pending')->count();
        $pendingJustifs = Justification::where('status', 'pending')->count();

        // Contrats expirant dans 30 jours
        $expiringQuery = Contract::where('is_active', true)
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<=', $today->copy()->addDays(30))
            ->whereDate('end_date', '>=', $today)
            ->with('employee.department')
            ->orderBy('end_date');

        $expiringContracts = $expiringQuery->count();

        $expiringList = $expiringQuery->get()->map(fn($c) => [
            'contract_id'   => $c->id,
            'employee_id'   => $c->employee_id,
            'employee_name' => $c->employee->full_name,
            'department'    => $c->employee->department?->name ?? '—',
            'contract_type' => $c->type,
            'end_date'      => $c->end_date->toDateString(),
            'days_left'     => (int) $today->diffInDays($c->end_date),
        ]);

        // Effectifs par direction
        $byDepartment = Department::withCount(['employees' => fn($q) => $q->where('status', 'active')])
            ->where('is_active', true)
            ->get()
            ->map(fn($d) => [
                'id'    => $d->id,
                'name'  => $d->name,
                'color' => $d->color ?? '#6366F1',
                'count' => $d->employees_count,
            ]);

        // Répartition par fonction (normalisée en majuscules)
        $byFonction = Employee::where('status', 'active')
            ->whereNotNull('fonction')
            ->where('fonction', '!=', '')
            ->selectRaw('UPPER(TRIM(fonction)) as fonction, COUNT(*) as count')
            ->groupBy(\Illuminate\Support\Facades\DB::raw('UPPER(TRIM(fonction))'))
            ->orderByDesc('count')
            ->limit(15)
            ->get()
            ->map(fn($e) => ['fonction' => $e->fonction, 'count' => (int) $e->count]);

        // Répartition par catégorie
        $byCategorie = Employee::where('status', 'active')
            ->whereNotNull('categorie_emploi')
            ->where('categorie_emploi', '!=', '')
            ->selectRaw('UPPER(TRIM(categorie_emploi)) as categorie, COUNT(*) as count')
            ->groupBy(\Illuminate\Support\Facades\DB::raw('UPPER(TRIM(categorie_emploi))'))
            ->orderByDesc('count')
            ->limit(15)
            ->get()
            ->map(fn($e) => ['categorie' => $e->categorie, 'count' => (int) $e->count]);

        // Activité récente (dernières embauches, congés, etc.)
        $recentActivity = $this->getRecentActivity();

        return response()->json([
            'today_attendance' => [
                'date'     => $today->toDateString(),
                'total'    => $activeEmployees,
                'present'  => $todayAttendances->where('status', 'present')->count(),
                'absent'   => $todayAttendances->where('status', 'absent')->count(),
                'late'     => $todayAttendances->where('status', 'late')->count(),
                'on_leave' => $todayAttendances->where('status', 'on_leave')->count(),
            ],
            'pending_leaves'       => $pendingLeaves,
            'pending_justifications' => $pendingJustifs,
            'expiring_contracts'      => $expiringContracts,
            'expiring_contracts_list' => $expiringList,
            'total_employees'      => $activeEmployees,
            'by_department'        => $byDepartment,
            'by_fonction'          => $byFonction,
            'by_categorie'         => $byCategorie,
            'recent_activity'      => $recentActivity,
        ]);
    }

    private function getRecentActivity(): array
    {
        $items = [];

        // New hires this month
        Employee::where('hire_date', '>=', Carbon::now()->startOfMonth())
            ->latest('hire_date')
            ->limit(5)
            ->get()
            ->each(fn($e) => $items[] = [
                'type'    => 'hire',
                'message' => "{$e->full_name} a rejoint l'équipe",
                'date'    => $e->hire_date,
            ]);

        // Recent leave approvals
        Leave::where('status', 'approved')
            ->where('updated_at', '>=', Carbon::now()->subDays(7))
            ->with('employee')
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->each(fn($l) => $items[] = [
                'type'    => 'leave_approved',
                'message' => "Congé approuvé pour {$l->employee->full_name}",
                'date'    => $l->updated_at,
            ]);

        usort($items, fn($a, $b) => $b['date'] <=> $a['date']);

        return array_slice($items, 0, 10);
    }
}
