<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\EvaluationAnnuelle;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class EvaluationsAgentTool implements IATool
{
    public function name(): string { return 'get_evaluations_agent'; }

    public function description(): string
    {
        return 'Retourne les évaluations annuelles d\'un agent : notes, appréciations, objectifs, commentaires. Pour toute question sur l\'évaluation de performance, notation, appréciation, entretien annuel.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'employee_number' => ['type' => 'string'],
                'nom'             => ['type' => 'string'],
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

        $query = EvaluationAnnuelle::where('employee_id', $employee->id)->orderByDesc('annee');
        if (! empty($input['annee'])) $query->where('annee', $input['annee']);

        $evals = $query->limit(10)->get()->map(fn($e) => [
            'annee'               => $e->annee,
            'statut'              => $e->statut,
            'note_resultats'      => $e->note_resultats,
            'note_competences'    => $e->note_competences,
            'note_comportement'   => $e->note_comportement,
            'note_developpement'  => $e->note_developpement,
            'note_globale'        => $e->note_globale,
            'appreciation'        => $e->appreciation,
            'objectifs'           => $e->objectifs_annee,
            'commentaire_evaluateur' => $e->commentaire_evaluateur,
            'date_entretien'      => optional($e->date_entretien)->format('d/m/Y'),
        ]);

        return [
            'agent'       => $employee->last_name . ' ' . $employee->first_name,
            'matricule'   => $employee->employee_number,
            'evaluations' => $evals->toArray(),
            'total'       => $evals->count(),
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
