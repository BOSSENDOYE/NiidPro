<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\Payslip;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class BulletinsPaieTool implements IATool
{
    public function name(): string { return 'get_bulletins_paie'; }

    public function description(): string
    {
        return 'Retourne les bulletins de paie d\'un agent : salaire brut, net, cotisations, primes, déductions, par mois/année. Pour toute question sur la paie, salaire, rémunération, bulletin.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'employee_number' => ['type' => 'string'],
                'nom'             => ['type' => 'string'],
                'annee'           => ['type' => 'integer', 'description' => 'Année (défaut: année en cours)'],
                'mois'            => ['type' => 'integer', 'description' => 'Mois 1-12 (optionnel)'],
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
        $query = Payslip::where('employee_id', $employee->id)->where('year', $annee)->orderBy('month');

        if (! empty($input['mois'])) $query->where('month', $input['mois']);

        $bulletins = $query->get()->map(fn($p) => [
            'mois'                   => $p->month . '/' . $p->year,
            'salaire_base'           => $p->base_salary,
            'salaire_brut'           => $p->gross_salary,
            'salaire_net'            => $p->net_salary,
            'primes'                 => $p->bonuses,
            'indemnites'             => $p->allowances,
            'heures_sup'             => $p->overtime_pay,
            'deductions'             => $p->deductions,
            'cotisations_salariales' => $p->employee_contributions,
            'cotisations_patronales' => $p->employer_contributions,
            'statut'                 => $p->status,
            'date_paiement'          => optional($p->paid_at)->format('d/m/Y'),
        ]);

        return [
            'agent'     => $employee->last_name . ' ' . $employee->first_name,
            'matricule' => $employee->employee_number,
            'annee'     => $annee,
            'bulletins' => $bulletins->toArray(),
            'total'     => $bulletins->count(),
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
