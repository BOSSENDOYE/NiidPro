<?php

namespace App\Services\IA\Tools;

use App\Models\Employee;
use App\Models\Leave;
use App\Models\OrganisationUnit;
use App\Services\IA\Tools\Contracts\IATool;
use App\Models\User;

class StatistiquesRHTool implements IATool
{
    public function name(): string
    {
        return 'get_statistiques_rh';
    }

    public function description(): string
    {
        return 'Retourne des statistiques globales sur les agents : nombre total, répartition par direction/catégorie/genre/statut, congés en cours. À utiliser pour toute question de type "combien d\'agents", "effectif", "nombre de salariés", etc.';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'detail' => [
                    'type' => 'string',
                    'enum' => ['global', 'par_direction', 'par_categorie', 'par_genre', 'conges'],
                    'description' => 'Niveau de détail souhaité (défaut: global)',
                ],
            ],
            'required' => [],
        ];
    }

    public function execute(array $input, User $user): array
    {
        $detail = $input['detail'] ?? 'global';

        // Scope manager : seulement sa direction
        $scope = function ($query) use ($user) {
            if ($user->hasRole('manager')) {
                $query->where('department_id', $user->department_id);
            }
            // employe ne devrait pas appeler cet outil, mais on bloque par sécurité
            if ($user->hasRole('employe') && ! $user->hasAnyRole(['super_admin', 'admin_rh', 'manager'])) {
                $query->whereRaw('1=0');
            }
        };

        $base = Employee::where('status', 'active');
        $scope($base);
        $total = (clone $base)->count();

        $result = [
            'total_agents_actifs' => $total,
        ];

        if ($detail === 'global' || $detail === 'par_direction') {
            $parDirection = (clone $base)
                ->join('organisation_units', 'employees.organisation_unit_id', '=', 'organisation_units.id')
                ->selectRaw('organisation_units.libelle as direction, count(*) as nombre')
                ->groupBy('organisation_units.libelle')
                ->orderByDesc('nombre')
                ->get()
                ->map(fn($r) => ['direction' => $r->direction, 'nombre' => $r->nombre])
                ->toArray();

            $result['par_direction'] = $parDirection;
        }

        if ($detail === 'global' || $detail === 'par_categorie') {
            $parCategorie = (clone $base)
                ->selectRaw('COALESCE(categorie_emploi, "Non défini") as categorie, count(*) as nombre')
                ->groupBy('categorie_emploi')
                ->orderByDesc('nombre')
                ->get()
                ->map(fn($r) => ['categorie' => $r->categorie, 'nombre' => $r->nombre])
                ->toArray();

            $result['par_categorie'] = $parCategorie;
        }

        if ($detail === 'global' || $detail === 'par_genre') {
            $hommes = (clone $base)->where('gender', 'M')->count();
            $femmes = (clone $base)->where('gender', 'F')->count();
            $result['par_genre'] = [
                'hommes' => $hommes,
                'femmes' => $femmes,
            ];
        }

        if ($detail === 'global' || $detail === 'conges') {
            $enConge = Leave::where('status', 'approved')
                ->whereDate('start_date', '<=', now())
                ->whereDate('end_date', '>=', now())
                ->count();

            $enAttente = Leave::where('status', 'pending')->count();

            $result['conges'] = [
                'agents_en_conge_aujourd_hui' => $enConge,
                'demandes_en_attente'          => $enAttente,
            ];
        }

        return $result;
    }
}
