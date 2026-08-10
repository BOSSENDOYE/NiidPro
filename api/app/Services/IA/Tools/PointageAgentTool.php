<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\Attendance;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class PointageAgentTool implements IATool
{
    public function name(): string { return 'get_pointage_agent'; }

    public function description(): string
    {
        return 'Retourne le pointage et les absences d\'un agent : présences, heures travaillées, heures supplémentaires, retards, absences. Pour toute question sur la présence, le pointage, les heures de travail.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'employee_number' => ['type' => 'string'],
                'nom'             => ['type' => 'string'],
                'mois'            => ['type' => 'integer', 'description' => 'Mois 1-12'],
                'annee'           => ['type' => 'integer'],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $employee = $this->resolve($input, $user);
        if (! $employee) return ['erreur' => 'Agent introuvable.'];
        if (! $this->canAccess($user, $employee)) return ['erreur' => 'Accès refusé.'];

        $annee = $input['annee'] ?? now()->year;
        $mois  = $input['mois']  ?? now()->month;

        $pointages = Attendance::where('employee_id', $employee->id)
            ->whereYear('date', $annee)
            ->whereMonth('date', $mois)
            ->orderBy('date')
            ->get();

        $resume = [
            'jours_travailles'   => $pointages->whereNotIn('status', ['absent'])->count(),
            'absences'           => $pointages->where('status', 'absent')->count(),
            'total_heures'       => round($pointages->sum('worked_minutes') / 60, 1),
            'heures_sup'         => round($pointages->sum('overtime_minutes') / 60, 1),
        ];

        $detail = $pointages->map(fn($p) => [
            'date'          => $p->date->format('d/m/Y'),
            'entree'        => $p->check_in,
            'sortie'        => $p->check_out,
            'heures'        => round($p->worked_minutes / 60, 1),
            'statut'        => $p->status,
        ])->toArray();

        return [
            'agent'     => $employee->last_name . ' ' . $employee->first_name,
            'matricule' => $employee->employee_number,
            'periode'   => $mois . '/' . $annee,
            'resume'    => $resume,
            'detail'    => $detail,
        ];
    }

    private function resolve(array $input, User $user): ?Employee
    {
        if (! empty($input['employee_number'])) return Employee::where('employee_number', $input['employee_number'])->first();
        if (! empty($input['nom'])) {
            $q = trim($input['nom']);
            return Employee::where(fn($qb) => $qb->where('first_name', 'like', "%{$q}%")->orWhere('last_name', 'like', "%{$q}%"))->first();
        }
        return $user->employee;
    }

    private function canAccess(User $user, Employee $employee): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin_rh'])) return true;
        if ($user->hasRole('manager')) return $employee->department_id === $user->department_id;
        return $employee->user_id === $user->id;
    }
}
