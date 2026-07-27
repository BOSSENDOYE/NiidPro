<?php

namespace Database\Seeders;

use App\Models\WorkflowConfig;
use Illuminate\Database\Seeder;

class WorkflowConfigSeeder extends Seeder
{
    public function run(): void
    {
        $workflows = [
            [
                'key'   => 'absence',
                'label' => 'Absences autorisées',
                'levels' => [
                    ['level' => 1, 'label' => 'Avis du Supérieur Hiérarchique',       'role_name' => 'manager',     'is_active' => true],
                    ['level' => 2, 'label' => 'Directeur Administratif et Financier', 'role_name' => 'admin_rh',    'is_active' => true],
                    ['level' => 3, 'label' => 'Secrétaire Général',                   'role_name' => 'admin_rh',    'is_active' => true],
                    ['level' => 4, 'label' => 'Directeur',                            'role_name' => 'manager',     'is_active' => true],
                    ['level' => 5, 'label' => 'Validation finale (DRH)',               'role_name' => 'super_admin', 'is_active' => true],
                ],
            ],
            [
                'key'   => 'conge',
                'label' => 'Congés annuels',
                'levels' => [
                    ['level' => 1, 'label' => 'Avis du Supérieur Hiérarchique',       'role_name' => 'manager',     'is_active' => true],
                    ['level' => 2, 'label' => 'Directeur Administratif et Financier', 'role_name' => 'admin_rh',    'is_active' => true],
                    ['level' => 3, 'label' => 'Secrétaire Général',                   'role_name' => 'admin_rh',    'is_active' => false],
                    ['level' => 4, 'label' => 'Directeur',                            'role_name' => 'manager',     'is_active' => true],
                    ['level' => 5, 'label' => 'Validation finale (DRH)',               'role_name' => 'super_admin', 'is_active' => false],
                ],
            ],
            [
                'key'   => 'conge_special',
                'label' => 'Congés spéciaux',
                'levels' => [
                    ['level' => 1, 'label' => 'Avis du Supérieur Hiérarchique',       'role_name' => 'manager',     'is_active' => true],
                    ['level' => 2, 'label' => 'Directeur Administratif et Financier', 'role_name' => 'admin_rh',    'is_active' => true],
                    ['level' => 3, 'label' => 'Secrétaire Général',                   'role_name' => 'admin_rh',    'is_active' => true],
                    ['level' => 4, 'label' => 'Directeur',                            'role_name' => 'manager',     'is_active' => true],
                    ['level' => 5, 'label' => 'Validation finale (DRH)',               'role_name' => 'super_admin', 'is_active' => true],
                ],
            ],
            [
                'key'   => 'mission',
                'label' => 'Ordres de mission',
                'levels' => [
                    ['level' => 1, 'label' => 'Avis du Supérieur Hiérarchique',       'role_name' => 'manager',     'is_active' => true],
                    ['level' => 2, 'label' => 'Directeur Administratif et Financier', 'role_name' => 'admin_rh',    'is_active' => true],
                    ['level' => 3, 'label' => 'Secrétaire Général',                   'role_name' => 'admin_rh',    'is_active' => false],
                    ['level' => 4, 'label' => 'Directeur',                            'role_name' => 'manager',     'is_active' => true],
                    ['level' => 5, 'label' => 'Validation finale (DRH)',               'role_name' => 'super_admin', 'is_active' => false],
                ],
            ],
        ];

        foreach ($workflows as $wf) {
            foreach ($wf['levels'] as $row) {
                WorkflowConfig::firstOrCreate(
                    ['workflow_key' => $wf['key'], 'level' => $row['level']],
                    [
                        'workflow_label' => $wf['label'],
                        'label'          => $row['label'],
                        'role_name'      => $row['role_name'],
                        'is_active'      => $row['is_active'],
                    ]
                );
            }
            $this->command->info("Workflow \"{$wf['label']}\" ({$wf['key']}) configuré.");
        }
    }
}
