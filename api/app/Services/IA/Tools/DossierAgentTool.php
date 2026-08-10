<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class DossierAgentTool implements IATool
{
    public function name(): string { return 'get_dossier_agent'; }

    public function description(): string
    {
        return 'Retourne le dossier complet d\'un agent : informations personnelles, poste, direction, contrat actif, famille, ancienneté. À utiliser pour toute question de profil, coordonnées, situation familiale, date d\'embauche, poste occupé.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'employee_number' => ['type' => 'string', 'description' => 'Matricule de l\'agent'],
                'nom'             => ['type' => 'string', 'description' => 'Nom ou prénom'],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $employee = $this->resolve($input, $user);
        if (! $employee) return ['erreur' => 'Agent introuvable.'];

        if (! $this->canAccess($user, $employee)) return ['erreur' => 'Accès refusé.'];

        $employee->load(['position', 'organisationUnit', 'department', 'familyMembers']);

        $contract = $employee->contracts()->where('is_active', true)->latest()->first();

        return [
            'matricule'      => $employee->employee_number,
            'nom_complet'    => $employee->last_name . ' ' . $employee->first_name,
            'genre'          => $employee->gender === 'M' ? 'Masculin' : ($employee->gender === 'F' ? 'Féminin' : null),
            'date_naissance' => optional($employee->birth_date)->format('d/m/Y'),
            'lieu_naissance' => $employee->birth_place,
            'nationalite'    => $employee->nationality,
            'telephone'      => $employee->phone_personal ?? $employee->phone_professional,
            'email'          => $employee->professional_email ?? $employee->personal_email,
            'adresse'        => $employee->address . ($employee->city ? ', ' . $employee->city : ''),
            'poste'          => $employee->position?->title ?? $employee->fonction,
            'direction'      => $employee->organisationUnit?->libelle,
            'departement'    => $employee->department?->name,
            'categorie'      => $employee->categorie_emploi,
            'echelon'        => $employee->echelon,
            'date_embauche'  => optional($employee->hire_date)->format('d/m/Y'),
            'anciennete_ans' => $employee->hire_date ? now()->diffInYears($employee->hire_date) : null,
            'statut'         => $employee->status,
            'contrat_type'   => $contract?->type,
            'contrat_depuis' => optional($contract?->start_date)->format('d/m/Y'),
            'salaire_base'   => $employee->base_salary,
            'situation_familiale' => [
                'nb_enfants'   => $employee->nombre_enfants_charge,
                'nb_femmes'    => $employee->nombre_femmes,
                'membres'      => $employee->familyMembers?->map(fn($f) => [
                    'relation' => $f->relation,
                    'prenom'   => $f->first_name,
                    'nom'      => $f->last_name,
                ])->toArray(),
            ],
        ];
    }

    private function resolve(array $input, User $user): ?Employee
    {
        if (! empty($input['employee_number'])) {
            return Employee::where('employee_number', $input['employee_number'])->first();
        }
        if (! empty($input['nom'])) {
            $q = trim($input['nom']);
            return Employee::where(fn($qb) => $qb->where('first_name', 'like', "%{$q}%")->orWhere('last_name', 'like', "%{$q}%"))->first();
        }
        return $user->employee;
    }

    private function canAccess(User $user, Employee $employee): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin_rh'])) return true;
        if ($user->hasRole('manager')) return $employee->user?->department_id === $user->department_id || $employee->department_id === $user->department_id;
        return $employee->user_id === $user->id;
    }
}
