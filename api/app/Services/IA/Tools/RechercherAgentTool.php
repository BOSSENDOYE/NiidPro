<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\User;
use App\Services\IA\Tools\Contracts\IATool;

class RechercherAgentTool implements IATool
{
    public function name(): string
    {
        return 'rechercher_agent';
    }

    public function description(): string
    {
        return 'Recherche des agents par nom, prénom ou matricule. '
             . 'Retourne une liste d\'agents (max 10) correspondant à la requête, '
             . 'filtrée selon les droits de l\'utilisateur connecté. '
             . 'Utilise cet outil quand l\'utilisateur cherche un employé ou veut connaître le matricule de quelqu\'un.';
    }

    public function inputSchema(): array
    {
        return [
            'type'       => 'object',
            'properties' => [
                'query' => [
                    'type'        => 'string',
                    'description' => 'Nom, prénom ou matricule à rechercher (minimum 2 caractères).',
                ],
            ],
            'required' => ['query'],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $query = trim($input['query'] ?? '');

        if (mb_strlen($query) < 2) {
            return ['error' => 'La recherche doit comporter au moins 2 caractères.'];
        }

        $q = Employee::with(['position', 'organisationUnit'])
            ->where('status', 'active')
            ->where(function ($q) use ($query) {
                $q->where('first_name', 'like', "%{$query}%")
                  ->orWhere('last_name', 'like', "%{$query}%")
                  ->orWhere('employee_number', 'like', "%{$query}%");
            });

        if ($user->hasAnyRole(['super_admin', 'admin_rh'])) {
            // Accès total
        } elseif ($user->hasRole('manager') && $user->department_id) {
            $q->where('department_id', $user->department_id);
        } else {
            // employe : peut seulement se retrouver lui-même
            $own = $user->employee ?? $user->linkedEmployee;
            if (! $own) {
                return ['agents' => [], 'total' => 0];
            }
            $q->where('id', $own->id);
        }

        $results = $q->limit(10)->get();

        return [
            'agents' => $results->map(fn(Employee $e) => [
                'matricule'   => $e->employee_number,
                'nom_complet' => $e->full_name,
                'poste'       => $e->position?->title,
                'direction'   => $e->organisationUnit?->libelle,
                'statut'      => $e->status,
            ])->toArray(),
            'total' => $results->count(),
        ];
    }
}
