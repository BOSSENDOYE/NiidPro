<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\Avancement;
use App\Models\Promotion;
use App\Models\MobiliteInterne;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class CarriereAgentTool implements IATool
{
    public function name(): string { return 'get_carriere_agent'; }

    public function description(): string
    {
        return 'Retourne le parcours de carrière d\'un agent : avancements d\'échelon, promotions de catégorie, mobilités internes (mutations). Pour toute question sur l\'évolution de carrière, avancement, promotion, mutation, changement de poste.';
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
        $employee = $this->resolve($input, $user);
        if (! $employee) return ['erreur' => 'Agent introuvable.'];
        if (! $this->canAccess($user, $employee)) return ['erreur' => 'Accès refusé.'];

        $avancements = Avancement::where('employee_id', $employee->id)
            ->orderByDesc('date_decision')->limit(10)->get()
            ->map(fn($a) => [
                'type'          => 'Avancement',
                'de'            => 'Échelon ' . $a->echelon_avant,
                'vers'          => 'Échelon ' . $a->echelon_apres,
                'date'          => optional($a->date_decision)->format('d/m/Y'),
                'statut'        => $a->statut,
                'note'          => $a->note_evaluation,
            ]);

        $promotions = Promotion::where('employee_id', $employee->id)
            ->orderByDesc('date_decision')->limit(10)->get()
            ->map(fn($p) => [
                'type'   => 'Promotion',
                'de'     => 'Catégorie ' . $p->categorie_avant,
                'vers'   => 'Catégorie ' . $p->categorie_apres,
                'date'   => optional($p->date_decision)->format('d/m/Y'),
                'statut' => $p->statut,
            ]);

        $mobilites = MobiliteInterne::where('employee_id', $employee->id)
            ->orderByDesc('date_prise_effet')->limit(10)->get()
            ->map(fn($m) => [
                'type'   => 'Mobilité ' . $m->type_mobilite,
                'motif'  => $m->motif,
                'date'   => optional($m->date_prise_effet)->format('d/m/Y'),
                'statut' => $m->statut,
            ]);

        $parcours = collect($avancements)->merge($promotions)->merge($mobilites)
            ->sortByDesc('date')->values();

        return [
            'agent'     => $employee->last_name . ' ' . $employee->first_name,
            'matricule' => $employee->employee_number,
            'categorie_actuelle' => $employee->categorie_emploi,
            'echelon_actuel'     => $employee->echelon,
            'parcours'  => $parcours->toArray(),
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
