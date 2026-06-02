<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Contract;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Roles & Permissions ─────────────────────────────────────────────
        $permissions = [
            'view employees', 'create employees', 'edit employees', 'delete employees',
            'view contracts', 'create contracts', 'edit contracts',
            'view attendances', 'manage attendances',
            'view leaves', 'create leaves', 'approve leaves',
            'view payslips', 'manage payslips',
            'view dashboard', 'view reports',
            'manage users', 'manage settings',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'super_admin']);
        $adminRh    = Role::firstOrCreate(['name' => 'admin_rh']);
        $manager    = Role::firstOrCreate(['name' => 'manager']);
        $employe    = Role::firstOrCreate(['name' => 'employe']);

        $adminRh->syncPermissions([
            'view employees', 'create employees', 'edit employees', 'delete employees',
            'view contracts', 'create contracts', 'edit contracts',
            'view attendances', 'manage attendances',
            'view leaves', 'create leaves', 'approve leaves',
            'view payslips', 'manage payslips',
            'view dashboard', 'view reports',
        ]);

        $manager->syncPermissions([
            'view employees', 'view attendances', 'manage attendances',
            'view leaves', 'approve leaves', 'view dashboard',
        ]);

        $employe->syncPermissions([
            'view leaves', 'create leaves', 'view payslips',
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

        // Map raccourci pour la suite du seeder
        $depts = [
            'CS'    => $cs,
            'DG'    => $dg,
            'SG'    => $sg,
            'DEP'   => $dep,
            'DAC'   => $dac,
            'DPSRC' => $dpsrc,
            'DDC'   => $ddc,
            'DAF'   => $daf,
        ];

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

        // ── Employees ANASER ────────────────────────────────────────────────
        $employeesData = [
            ['first_name' => 'Moussa',    'last_name' => 'Diallo',    'dept' => 'DG',    'pos' => 'P-DG',    'salary' => 900000, 'email' => 'manager@niidpro.com',  'hire' => '2018-01-15'],
            ['first_name' => 'Aminata',   'last_name' => 'Ndiaye',    'dept' => 'DG',    'pos' => 'P-AD',    'salary' => 250000, 'email' => 'rh@niidpro.com',        'hire' => '2019-03-01'],
            ['first_name' => 'Ibrahima',  'last_name' => 'Sow',       'dept' => 'SG',    'pos' => 'P-SG',    'salary' => 700000, 'hire' => '2018-06-01'],
            ['first_name' => 'Fatou',     'last_name' => 'Diop',      'dept' => 'DEP',   'pos' => 'P-DEP',   'salary' => 580000, 'hire' => '2019-09-15'],
            ['first_name' => 'Cheikh',    'last_name' => 'Fall',      'dept' => 'DEP',   'pos' => 'P-CE',    'salary' => 320000, 'hire' => '2021-02-01'],
            ['first_name' => 'Marième',   'last_name' => 'Ba',        'dept' => 'DAC',   'pos' => 'P-DAC',   'salary' => 580000, 'hire' => '2019-11-10'],
            ['first_name' => 'Ousmane',   'last_name' => 'Sarr',      'dept' => 'DAC',   'pos' => 'P-DAHI',  'salary' => 420000, 'hire' => '2020-04-01'],
            ['first_name' => 'Rokhaya',   'last_name' => 'Mbaye',     'dept' => 'DPSRC', 'pos' => 'P-DPSRC', 'salary' => 580000, 'hire' => '2020-01-15'],
            ['first_name' => 'Pape',      'last_name' => 'Niang',     'dept' => 'DPSRC', 'pos' => 'P-CC',    'salary' => 310000, 'hire' => '2022-03-01'],
            ['first_name' => 'Ndèye',     'last_name' => 'Gueye',     'dept' => 'DDC',   'pos' => 'P-DDC',   'salary' => 580000, 'hire' => '2019-07-01'],
            ['first_name' => 'Alioune',   'last_name' => 'Diagne',    'dept' => 'DDC',   'pos' => 'P-COOP',  'salary' => 360000, 'hire' => '2021-06-15'],
            ['first_name' => 'Seynabou',  'last_name' => 'Thiaw',     'dept' => 'DAF',   'pos' => 'P-DAF',   'salary' => 580000, 'hire' => '2018-09-01'],
            ['first_name' => 'Modou',     'last_name' => 'Faye',      'dept' => 'DAF',   'pos' => 'P-FIN',   'salary' => 430000, 'hire' => '2020-06-01'],
            ['first_name' => 'Adja',      'last_name' => 'Konaté',    'dept' => 'DAF',   'pos' => 'P-RH',    'salary' => 430000, 'hire' => '2021-01-10'],
            ['first_name' => 'Serigne',   'last_name' => 'Diallo',    'dept' => 'DEP',   'pos' => 'P-ODSR',  'salary' => 390000, 'hire' => '2022-05-01'],
            ['first_name' => 'Khady',     'last_name' => 'Sène',      'dept' => 'DPSRC', 'pos' => 'P-EPR',   'salary' => 390000, 'hire' => '2022-09-01'],
            ['first_name' => 'Babacar',   'last_name' => 'Touré',     'dept' => 'DAC',   'pos' => 'P-CH',    'salary' => 390000, 'hire' => '2023-01-15'],
            ['first_name' => 'Aïssatou',  'last_name' => 'Cissé',     'dept' => 'DDC',   'pos' => 'P-DT',    'salary' => 360000, 'hire' => '2023-04-01'],
        ];

        $createdEmployees = [];
        foreach ($employeesData as $i => $e) {
            $num = 'EMP' . str_pad($i + 1, 4, '0', STR_PAD_LEFT);
            $emp = Employee::firstOrCreate(['employee_number' => $num], [
                'first_name'         => $e['first_name'],
                'last_name'          => $e['last_name'],
                'department_id'      => $depts[$e['dept']]->id,
                'position_id'        => $pos[$e['pos']]->id,
                'professional_email' => $e['email'] ?? strtolower($e['first_name'] . '.' . $e['last_name'] . '@niidpro.com'),
                'hire_date'          => $e['hire'],
                'base_salary'        => $e['salary'],
                'status'             => 'active',
                'annual_leave_days'  => 25,
                'country'            => 'France',
                'city'               => 'Paris',
            ]);

            if (isset($e['email'])) {
                $user = User::where('email', $e['email'])->first();
                if ($user && !$emp->user_id) {
                    $emp->update(['user_id' => $user->id]);
                }
            }

            $createdEmployees[] = $emp;
        }

        // ── Contracts ───────────────────────────────────────────────────────
        foreach ($createdEmployees as $i => $emp) {
            Contract::firstOrCreate(['employee_id' => $emp->id, 'is_active' => true], [
                'type'       => $i < 8 ? 'CDI' : 'CDD',
                'start_date' => $emp->hire_date,
                'end_date'   => $i >= 8 ? Carbon::parse($emp->hire_date)->addYear()->toDateString() : null,
                'salary'     => $emp->base_salary,
                'working_hours_per_week' => 35,
                'is_active'  => true,
            ]);
        }

        // ── Today's Attendances ─────────────────────────────────────────────
        $today    = Carbon::today();
        $statuses = ['present', 'present', 'present', 'present', 'late', 'present', 'present', 'present', 'present', 'present', 'late', 'present', 'present', 'on_leave', 'present', 'present', 'absent', 'present'];
        foreach ($createdEmployees as $i => $emp) {
            Attendance::firstOrCreate(['employee_id' => $emp->id, 'date' => $today->toDateString()], [
                'check_in'       => !in_array($statuses[$i], ['absent', 'on_leave'])
                    ? $today->copy()->setTime($statuses[$i] === 'late' ? 9 : 8, rand(0, 30))->toDateTimeString()
                    : null,
                'status'         => $statuses[$i],
                'source'         => 'web',
                'worked_minutes' => in_array($statuses[$i], ['present', 'late']) ? rand(440, 520) : null,
            ]);
        }

        // ── Pending Leaves ──────────────────────────────────────────────────
        $cpType  = LeaveType::where('code', 'CP')->first();
        $rttType = LeaveType::where('code', 'RTT')->first();

        Leave::firstOrCreate(['employee_id' => $createdEmployees[2]->id, 'leave_type_id' => $cpType->id, 'start_date' => Carbon::now()->addDays(5)->toDateString()], [
            'end_date'   => Carbon::now()->addDays(9)->toDateString(),
            'days_count' => 5,
            'status'     => 'pending',
            'reason'     => 'Vacances annuelles',
        ]);

        Leave::firstOrCreate(['employee_id' => $createdEmployees[4]->id, 'leave_type_id' => $rttType->id, 'start_date' => Carbon::now()->addDays(2)->toDateString()], [
            'end_date'   => Carbon::now()->addDays(3)->toDateString(),
            'days_count' => 2,
            'status'     => 'pending',
            'reason'     => 'RTT',
        ]);

        Leave::firstOrCreate(['employee_id' => $createdEmployees[7]->id, 'leave_type_id' => $cpType->id, 'start_date' => Carbon::now()->addDays(10)->toDateString()], [
            'end_date'   => Carbon::now()->addDays(19)->toDateString(),
            'days_count' => 10,
            'status'     => 'pending',
            'reason'     => 'Congé été',
        ]);

        // ── Document Templates ──────────────────────────────────────────────
        $this->call(DocumentTemplateSeeder::class);

        $this->command->info('NiidPro database seeded successfully!');
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
