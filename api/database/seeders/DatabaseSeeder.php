<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\LeaveType;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Roles & Permissions ─────────────────────────────────────────────
        // Synchronise toutes les permissions depuis config/permissions.php
        $catalog = config('permissions');
        foreach ($catalog as $module) {
            foreach (array_keys($module['perms']) as $permName) {
                Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $adminRh    = Role::firstOrCreate(['name' => 'admin_rh',    'guard_name' => 'web']);
        $manager    = Role::firstOrCreate(['name' => 'manager',     'guard_name' => 'web']);
        $employe    = Role::firstOrCreate(['name' => 'employe',     'guard_name' => 'web']);

        $adminRh->syncPermissions([
            'dashboard.voir',
            'employes.voir', 'employes.creer', 'employes.modifier', 'employes.supprimer',
            'contrats.voir', 'contrats.creer', 'contrats.modifier',
            'pointage.voir', 'pointage.gerer',
            'conges.voir', 'conges.approuver',
            'bulletins.voir', 'bulletins.gerer',
            'sanctions.voir', 'sanctions.gerer',
            'taches.voir', 'taches.gerer',
            'documents.voir', 'documents.gerer',
            'formations.voir', 'formations.creer', 'formations.approuver', 'formations.gerer',
            'plan_formation.voir', 'plan_formation.gerer',
            'recrutement.voir', 'recrutement.creer', 'recrutement.approuver', 'recrutement.gerer',
            'plan_recrutement.voir', 'plan_recrutement.gerer',
            'evaluations.voir', 'evaluations.creer', 'evaluations.gerer',
            'carrieres.voir', 'carrieres.evaluer', 'carrieres.avancement', 'carrieres.promotion', 'carrieres.pdi', 'carrieres.mobilite',
            'rapports.voir',
        ]);

        $manager->syncPermissions([
            'dashboard.voir',
            'employes.voir',
            'pointage.voir', 'pointage.gerer',
            'conges.voir', 'conges.approuver',
            'taches.voir', 'taches.gerer',
            'formations.voir',
            'recrutement.voir',
            'evaluations.voir',
            'carrieres.voir', 'carrieres.evaluer',
        ]);

        $employe->syncPermissions([
            'conges.voir', 'conges.creer',
            'bulletins.voir',
            'taches.voir',
            'documents.voir',
            'formations.voir', 'formations.creer',
        ]);

        // ── Users ───────────────────────────────────────────────────────────
        $superAdminUser = User::firstOrCreate(['email' => 'admin@niidpro.com'], [
            'name'      => 'Super Admin',
            'password'  => bcrypt('password'),
            'is_active' => true,
        ]);
        $superAdminUser->assignRole('super_admin');

        $rhUser = User::firstOrCreate(['email' => 'rh@niidpro.com'], [
            'name'      => 'Marie Dupont',
            'password'  => bcrypt('password'),
            'is_active' => true,
        ]);
        $rhUser->assignRole('admin_rh');

        $managerUser = User::firstOrCreate(['email' => 'manager@niidpro.com'], [
            'name'      => 'Jean Martin',
            'password'  => bcrypt('password'),
            'is_active' => true,
        ]);
        $managerUser->assignRole('manager');

        // ── Departments — Structure ANASER ──────────────────────────────────
        // Niveau 0 : instances autonomes
        $cs = Department::firstOrCreate(['code' => 'CS'], [
            'name'        => 'Conseil de Surveillance',
            'description' => 'Organe de contrôle et de surveillance',
            'color'       => '#1B4B8A',
            'is_active'   => true,
        ]);

        $dg = Department::firstOrCreate(['code' => 'DG'], [
            'name'        => 'Direction Générale',
            'description' => 'Instance de direction de l\'Agence',
            'color'       => '#1B4B8A',
            'is_active'   => true,
        ]);

        // Niveau 1 : Secrétariat Général (sous DG)
        $sg = Department::firstOrCreate(['code' => 'SG'], [
            'name'        => 'Secrétariat Général',
            'description' => 'Coordination générale des directions et cellules rattachées',
            'parent_id'   => $dg->id,
            'color'       => '#1B4B8A',
            'is_active'   => true,
        ]);

        // Niveau 2 : 5 Directions (sous SG)
        $dep = Department::firstOrCreate(['code' => 'DEP'], [
            'name'        => 'Direction des Études et la Planification',
            'description' => 'Études, recherche, planification stratégique et observatoire',
            'parent_id'   => $sg->id,
            'color'       => '#0284C7',
            'is_active'   => true,
        ]);

        $dac = Department::firstOrCreate(['code' => 'DAC'], [
            'name'        => 'Direction de l\'Audit et de la Conformité',
            'description' => 'Audit, homologation des infrastructures et conformité réglementaire',
            'parent_id'   => $sg->id,
            'color'       => '#7C3AED',
            'is_active'   => true,
        ]);

        $dpsrc = Department::firstOrCreate(['code' => 'DPSRC'], [
            'name'        => 'Direction de la Promotion Sécurité Routière et Communication',
            'description' => 'Communication, sensibilisation, éducation et prévention routière',
            'parent_id'   => $sg->id,
            'color'       => '#059669',
            'is_active'   => true,
        ]);

        $ddc = Department::firstOrCreate(['code' => 'DDC'], [
            'name'        => 'Direction du Développement et de la Coopération',
            'description' => 'Coopération internationale et déploiement territorial',
            'parent_id'   => $sg->id,
            'color'       => '#D97706',
            'is_active'   => true,
        ]);

        $daf = Department::firstOrCreate(['code' => 'DAF'], [
            'name'        => 'Direction Administrative et Financière',
            'description' => 'Gestion administrative, financière et des ressources humaines',
            'parent_id'   => $sg->id,
            'color'       => '#DC2626',
            'is_active'   => true,
        ]);

        // Niveau 3 : Divisions (2 par direction)
        Department::firstOrCreate(['code' => 'DIV-ODSR'], [
            'name'        => 'Observatoire de la sécurité routière',
            'description' => 'Division',
            'parent_id'   => $dep->id,
            'color'       => '#0284C7',
            'is_active'   => true,
        ]);
        Department::firstOrCreate(['code' => 'DIV-EP'], [
            'name'        => 'Études et planification',
            'description' => 'Division',
            'parent_id'   => $dep->id,
            'color'       => '#0284C7',
            'is_active'   => true,
        ]);

        Department::firstOrCreate(['code' => 'DIV-DAHI'], [
            'name'        => 'Audit et Homologation des Infrastructures',
            'description' => 'Division',
            'parent_id'   => $dac->id,
            'color'       => '#7C3AED',
            'is_active'   => true,
        ]);
        Department::firstOrCreate(['code' => 'DIV-CH'], [
            'name'        => 'Conformité et Homologations',
            'description' => 'Division',
            'parent_id'   => $dac->id,
            'color'       => '#7C3AED',
            'is_active'   => true,
        ]);

        Department::firstOrCreate(['code' => 'DIV-CSEV'], [
            'name'        => 'Communication de la Sensibilisation et de l\'événementiel',
            'description' => 'Division',
            'parent_id'   => $dpsrc->id,
            'color'       => '#059669',
            'is_active'   => true,
        ]);
        Department::firstOrCreate(['code' => 'DIV-EPR'], [
            'name'        => 'Éducation et Prévention routière',
            'description' => 'Division',
            'parent_id'   => $dpsrc->id,
            'color'       => '#059669',
            'is_active'   => true,
        ]);

        Department::firstOrCreate(['code' => 'DIV-COOP'], [
            'name'        => 'Coopération',
            'description' => 'Division',
            'parent_id'   => $ddc->id,
            'color'       => '#D97706',
            'is_active'   => true,
        ]);
        Department::firstOrCreate(['code' => 'DIV-DT'], [
            'name'        => 'Déploiement territorial',
            'description' => 'Division',
            'parent_id'   => $ddc->id,
            'color'       => '#D97706',
            'is_active'   => true,
        ]);

        Department::firstOrCreate(['code' => 'DIV-FIN'], [
            'name'        => 'Finances',
            'description' => 'Division',
            'parent_id'   => $daf->id,
            'color'       => '#DC2626',
            'is_active'   => true,
        ]);
        Department::firstOrCreate(['code' => 'DIV-RH'], [
            'name'        => 'Ressources humaines',
            'description' => 'Division',
            'parent_id'   => $daf->id,
            'color'       => '#DC2626',
            'is_active'   => true,
        ]);

        // ── Positions ANASER ─────────────────────────────────────────────────
        $positions = [
            ['title' => 'Directeur Général',                                   'code' => 'P-DG',    'department_id' => $dg->id,    'base_salary_min' => 700000, 'base_salary_max' => 1000000],
            ['title' => 'Secrétaire Général',                                  'code' => 'P-SG',    'department_id' => $sg->id,    'base_salary_min' => 550000, 'base_salary_max' => 800000],
            ['title' => 'Directeur des Études et la Planification',            'code' => 'P-DEP',   'department_id' => $dep->id,   'base_salary_min' => 450000, 'base_salary_max' => 650000],
            ['title' => 'Directeur de l\'Audit et de la Conformité',           'code' => 'P-DAC',   'department_id' => $dac->id,   'base_salary_min' => 450000, 'base_salary_max' => 650000],
            ['title' => 'Directeur de la Promotion Sécurité et Communication', 'code' => 'P-DPSRC', 'department_id' => $dpsrc->id, 'base_salary_min' => 450000, 'base_salary_max' => 650000],
            ['title' => 'Directeur du Développement et de la Coopération',     'code' => 'P-DDC',   'department_id' => $ddc->id,   'base_salary_min' => 450000, 'base_salary_max' => 650000],
            ['title' => 'Directeur Administratif et Financier',                'code' => 'P-DAF',   'department_id' => $daf->id,   'base_salary_min' => 450000, 'base_salary_max' => 650000],
            ['title' => 'Chef de Division — Observatoire',                     'code' => 'P-ODSR',  'department_id' => $dep->id,   'base_salary_min' => 350000, 'base_salary_max' => 500000],
            ['title' => 'Chef de Division — Études et Planification',          'code' => 'P-EP',    'department_id' => $dep->id,   'base_salary_min' => 350000, 'base_salary_max' => 500000],
            ['title' => 'Chef de Division — Audit Infrastructures',            'code' => 'P-DAHI',  'department_id' => $dac->id,   'base_salary_min' => 350000, 'base_salary_max' => 500000],
            ['title' => 'Chef de Division — Conformité',                       'code' => 'P-CH',    'department_id' => $dac->id,   'base_salary_min' => 350000, 'base_salary_max' => 500000],
            ['title' => 'Chef de Division — Communication & Sensibilisation',  'code' => 'P-CSEV',  'department_id' => $dpsrc->id, 'base_salary_min' => 350000, 'base_salary_max' => 500000],
            ['title' => 'Chef de Division — Éducation & Prévention',           'code' => 'P-EPR',   'department_id' => $dpsrc->id, 'base_salary_min' => 350000, 'base_salary_max' => 500000],
            ['title' => 'Chargé de Coopération',                               'code' => 'P-COOP',  'department_id' => $ddc->id,   'base_salary_min' => 280000, 'base_salary_max' => 420000],
            ['title' => 'Chargé de Déploiement territorial',                   'code' => 'P-DT',    'department_id' => $ddc->id,   'base_salary_min' => 280000, 'base_salary_max' => 420000],
            ['title' => 'Responsable des Finances',                            'code' => 'P-FIN',   'department_id' => $daf->id,   'base_salary_min' => 320000, 'base_salary_max' => 480000],
            ['title' => 'Responsable des Ressources Humaines',                 'code' => 'P-RH',    'department_id' => $daf->id,   'base_salary_min' => 320000, 'base_salary_max' => 480000],
            ['title' => 'Chargé d\'Études',                                    'code' => 'P-CE',    'department_id' => $dep->id,   'base_salary_min' => 250000, 'base_salary_max' => 380000],
            ['title' => 'Chargé de Communication',                             'code' => 'P-CC',    'department_id' => $dpsrc->id, 'base_salary_min' => 250000, 'base_salary_max' => 380000],
            ['title' => 'Assistante de Direction',                             'code' => 'P-AD',    'department_id' => $dg->id,    'base_salary_min' => 200000, 'base_salary_max' => 300000],
        ];

        $pos = [];
        foreach ($positions as $p) {
            $pos[$p['code']] = Position::firstOrCreate(['code' => $p['code']], $p);
        }

        // ── Leave Types ─────────────────────────────────────────────────────
        $leaveTypes = [
            ['name' => 'Congés payés',        'code' => 'CP',  'color' => '#3B82F6', 'paid' => true,  'max_days_per_year' => 25],
            ['name' => 'RTT',                 'code' => 'RTT', 'color' => '#8B5CF6', 'paid' => true,  'max_days_per_year' => 12],
            ['name' => 'Maladie',             'code' => 'MAL', 'color' => '#EF4444', 'paid' => false, 'requires_justification' => true],
            ['name' => 'Maternité/Paternité', 'code' => 'MAT', 'color' => '#F59E0B', 'paid' => true],
            ['name' => 'Sans solde',          'code' => 'SS',  'color' => '#6B7280', 'paid' => false],
            ['name' => 'Formation',           'code' => 'FOR', 'color' => '#10B981', 'paid' => true],
            ['name' => 'Événement familial',  'code' => 'FAM', 'color' => '#EC4899', 'paid' => true,  'max_days_per_year' => 5],
        ];

        foreach ($leaveTypes as $lt) {
            LeaveType::firstOrCreate(['code' => $lt['code']], $lt);
        }

        // ── Document Templates ──────────────────────────────────────────────
        $this->call(DocumentTemplateSeeder::class);

        // ── Agents ANASER ───────────────────────────────────────────────────
        $this->call(EmployeeSeeder::class);

        // ── Training Module ──────────────────────────────────────────────────
        $this->call(TrainingSeeder::class);

        // ── Module Évaluation Période d'Essai ────────────────────────────────
        $this->call(EvaluationSeeder::class);

        // ── Hiérarchies / Classes / Échelons ────────────────────────────────────
        $this->call(HierarchieClasseEchelonSeeder::class);

        // ── Module Gestion des Carrières ──────────────────────────────────────
        $this->call(CarriereSeeder::class);

        $this->command->info('RH+PAIE database seeded successfully!');
        $this->command->table(
            ['Rôle', 'Email', 'Mot de passe'],
            [
                ['super_admin', 'admin@niidpro.com',   'password'],
                ['admin_rh',    'rh@niidpro.com',      'password'],
                ['manager',     'manager@niidpro.com', 'password'],
            ]
        );
    }
}
