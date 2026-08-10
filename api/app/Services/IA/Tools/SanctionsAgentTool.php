<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\Sanction;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class SanctionsAgentTool implements IATool
{
    public function name(): string { return 'get_sanctions_agent'; }

    public function description(): string
    {
        return 'Retourne les sanctions disciplinaires d\'un agent : type, motif, date, durée. Réservé aux RH et managers. Pour toute question sur les sanctions, mesures disciplinaires, avertissements, suspensions.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'employee_number' => ['type' => 'string'],
                'nom'             => ['type' => 'string'],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        if (! $user->hasAnyRole(['super_admin', 'admin_rh', 'manager'])) {
            return ['erreur' => 'Accès refusé. Les informations disciplinaires sont réservées aux RH et managers.'];
        }

        $employee = $this->resolve($input, $user);
        if (! $employee) return ['erreur' => 'Agent introuvable.'];

        if ($user->hasRole('manager') && $employee->department_id !== $user->department_id) {
            return ['erreur' => 'Accès refusé.'];
        }

        $sanctions = Sanction::where('employee_id', $employee->id)
            ->orderByDesc('sanction_date')->get()
            ->map(fn($s) => [
                'type'        => $s->type,
                'motif'       => $s->reason,
                'date'        => optional($s->sanction_date)->format('d/m/Y'),
                'debut'       => optional($s->start_date)->format('d/m/Y'),
                'fin'         => optional($s->end_date)->format('d/m/Y'),
                'duree_jours' => $s->duration_days,
                'statut'      => $s->status,
                'reference'   => $s->reference,
            ]);

        return [
            'agent'     => $employee->last_name . ' ' . $employee->first_name,
            'matricule' => $employee->employee_number,
            'sanctions' => $sanctions->toArray(),
            'total'     => $sanctions->count(),
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
}
