<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\Leave;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class HistoriqueCongesAgentTool implements IATool
{
    public function name(): string { return 'get_historique_conges'; }

    public function description(): string
    {
        return 'Retourne l\'historique détaillé des demandes de congé d\'un agent : dates, durée, statut (approuvé/rejeté/en attente), motif. Pour toute question sur les congés passés, en cours, ou refusés.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'employee_number' => ['type' => 'string'],
                'nom'             => ['type' => 'string'],
                'statut'          => ['type' => 'string', 'enum' => ['all', 'approved', 'pending', 'rejected'], 'description' => 'Filtrer par statut (défaut: all)'],
                'annee'           => ['type' => 'integer', 'description' => 'Filtrer par année'],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $employee = $this->resolve($input, $user);
        if (! $employee) return ['erreur' => 'Agent introuvable.'];
        if (! $this->canAccess($user, $employee)) return ['erreur' => 'Accès refusé.'];

        $query = Leave::where('employee_id', $employee->id)->with('leaveType')->orderByDesc('start_date');

        if (! empty($input['statut']) && $input['statut'] !== 'all') {
            $query->where('status', $input['statut']);
        }
        if (! empty($input['annee'])) {
            $query->whereYear('start_date', $input['annee']);
        }

        $conges = $query->limit(20)->get()->map(fn($l) => [
            'type'       => $l->leaveType?->name ?? 'N/A',
            'debut'      => $l->start_date->format('d/m/Y'),
            'fin'        => $l->end_date->format('d/m/Y'),
            'jours'      => $l->days_count,
            'statut'     => $l->status,
            'motif'      => $l->reason,
            'reference'  => $l->leave_decision_ref,
        ]);

        return [
            'agent'        => $employee->last_name . ' ' . $employee->first_name,
            'matricule'    => $employee->employee_number,
            'total'        => $conges->count(),
            'historique'   => $conges->toArray(),
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
