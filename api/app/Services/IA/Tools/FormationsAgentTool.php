<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\Training;
use App\Models\FormationInscription;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class FormationsAgentTool implements IATool
{
    public function name(): string { return 'get_formations_agent'; }

    public function description(): string
    {
        return 'Retourne les formations suivies ou planifiées pour un agent, ou la liste des formations disponibles. Pour toute question sur la formation, plan de formation, sessions, inscriptions, certifications.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'employee_number' => ['type' => 'string'],
                'nom'             => ['type' => 'string'],
                'liste_globale'   => ['type' => 'boolean', 'description' => 'true pour lister toutes les formations de la structure'],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        if (! empty($input['liste_globale'])) {
            if (! $user->hasAnyRole(['super_admin', 'admin_rh', 'manager'])) {
                return ['erreur' => 'Accès refusé.'];
            }
            $formations = Training::orderByDesc('start_date')->limit(20)->get()->map(fn($t) => [
                'titre'    => $t->title,
                'statut'   => $t->status,
                'debut'    => optional($t->start_date)->format('d/m/Y'),
                'fin'      => optional($t->end_date)->format('d/m/Y'),
                'duree'    => $t->duration_days . ' jour(s)',
                'lieu'     => $t->location,
                'cout'     => $t->actual_cost ?? $t->estimated_cost,
                'participants' => $t->participants_count,
            ]);
            return ['formations' => $formations->toArray(), 'total' => $formations->count()];
        }

        $employee = $this->resolve($input, $user);
        if (! $employee) return ['erreur' => 'Agent introuvable.'];
        if (! $this->canAccess($user, $employee)) return ['erreur' => 'Accès refusé.'];

        $inscriptions = FormationInscription::where('employee_id', $employee->id)
            ->with('session.training')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn($i) => [
                'formation' => $i->session?->training?->title ?? 'N/A',
                'statut'    => $i->statut,
                'date_attestation' => optional($i->date_attestation)->format('d/m/Y'),
            ]);

        return [
            'agent'       => $employee->last_name . ' ' . $employee->first_name,
            'matricule'   => $employee->employee_number,
            'formations'  => $inscriptions->toArray(),
            'total'       => $inscriptions->count(),
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
