<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\User;
use App\Services\IA\Tools\Contracts\IATool;

class SoldeCongesTool implements IATool
{
    public function name(): string
    {
        return 'get_solde_conges';
    }

    public function description(): string
    {
        return 'Retourne le solde de congés d\'un agent : jours accordés, jours restants, jours en attente de validation. '
             . 'Si aucun paramètre n\'est fourni, retourne les données de l\'utilisateur connecté. '
             . 'Utilise cet outil quand l\'utilisateur demande son solde de congés, le nombre de jours restants, ou les congés d\'un collègue.';
    }

    public function inputSchema(): array
    {
        return [
            'type'       => 'object',
            'properties' => [
                'employee_number' => [
                    'type'        => 'string',
                    'description' => 'Matricule de l\'agent (ex: EMP0001). Optionnel — si absent, retourne les données de l\'utilisateur connecté.',
                ],
                'nom' => [
                    'type'        => 'string',
                    'description' => 'Nom ou prénom de l\'agent à rechercher. Optionnel.',
                ],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $employee = $this->resolveEmployee($input, $user);

        if (! $employee) {
            return ['error' => 'Agent non trouvé.'];
        }

        if (! $this->canAccess($user, $employee)) {
            return ['error' => 'Vous n\'avez pas les droits pour consulter les congés de cet agent.'];
        }

        $pendingDays = $employee->leaves()
            ->where('status', 'pending')
            ->sum('days_count');

        return [
            'matricule'        => $employee->employee_number,
            'nom_complet'      => $employee->full_name,
            'conges_accordes'  => (int) $employee->nbre_jour_conge,
            'conges_restants'  => (int) $employee->nbre_jour_restant,
            'conges_en_attente' => (int) $pendingDays,
            'droit_annuel'     => (int) $employee->annual_leave_days,
        ];
    }

    private function resolveEmployee(array $input, User $user): ?Employee
    {
        if (! empty($input['employee_number'])) {
            return Employee::where('employee_number', trim($input['employee_number']))->first();
        }

        if (! empty($input['nom'])) {
            $query = trim($input['nom']);
            return Employee::where(function ($q) use ($query) {
                $q->where('first_name', 'like', "%{$query}%")
                  ->orWhere('last_name', 'like', "%{$query}%");
            })->first();
        }

        // Aucun paramètre → données de l'utilisateur connecté
        return $user->employee ?? $user->linkedEmployee;
    }

    private function canAccess(User $user, Employee $employee): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin_rh'])) {
            return true;
        }

        if ($user->hasRole('manager')) {
            // Le manager ne voit que son département
            return $employee->department_id === $user->department_id;
        }

        // employe : uniquement ses propres données
        $own = $user->employee ?? $user->linkedEmployee;
        return $own && $own->id === $employee->id;
    }
}
