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

        // ── Departments ─────────────────────────────────────────────────────
        $directions = [
            ['name' => 'Direction Générale',      'code' => 'DG',  'color' => '#6366F1'],
            ['name' => 'Ressources Humaines',      'code' => 'RH',  'color' => '#8B5CF6'],
            ['name' => 'Informatique & Systèmes', 'code' => 'IT',  'color' => '#3B82F6'],
            ['name' => 'Finance & Comptabilité',   'code' => 'FIN', 'color' => '#10B981'],
            ['name' => 'Commercial & Marketing',   'code' => 'COM', 'color' => '#F59E0B'],
            ['name' => 'Production & Opérations', 'code' => 'PRO', 'color' => '#EF4444'],
        ];

        $depts = [];
        foreach ($directions as $d) {
            $depts[$d['code']] = Department::firstOrCreate(['code' => $d['code']], $d);
        }

        // ── Positions ───────────────────────────────────────────────────────
        $positions = [
            ['title' => 'Directeur Général',    'code' => 'DG01',  'department_id' => $depts['DG']->id,  'base_salary_min' => 5000, 'base_salary_max' => 8000],
            ['title' => 'Responsable RH',        'code' => 'RH01',  'department_id' => $depts['RH']->id,  'base_salary_min' => 3500, 'base_salary_max' => 5000],
            ['title' => 'Chargé RH',             'code' => 'RH02',  'department_id' => $depts['RH']->id,  'base_salary_min' => 2500, 'base_salary_max' => 3500],
            ['title' => 'Responsable IT',        'code' => 'IT01',  'department_id' => $depts['IT']->id,  'base_salary_min' => 4000, 'base_salary_max' => 6000],
            ['title' => 'Développeur Backend',   'code' => 'IT02',  'department_id' => $depts['IT']->id,  'base_salary_min' => 3000, 'base_salary_max' => 5000],
            ['title' => 'Développeur Frontend',  'code' => 'IT03',  'department_id' => $depts['IT']->id,  'base_salary_min' => 3000, 'base_salary_max' => 5000],
            ['title' => 'Directeur Financier',   'code' => 'FIN01', 'department_id' => $depts['FIN']->id, 'base_salary_min' => 4500, 'base_salary_max' => 7000],
            ['title' => 'Comptable',             'code' => 'FIN02', 'department_id' => $depts['FIN']->id, 'base_salary_min' => 2800, 'base_salary_max' => 3800],
            ['title' => 'Commercial Senior',     'code' => 'COM01', 'department_id' => $depts['COM']->id, 'base_salary_min' => 3000, 'base_salary_max' => 4500],
            ['title' => 'Chargé Marketing',      'code' => 'COM02', 'department_id' => $depts['COM']->id, 'base_salary_min' => 2500, 'base_salary_max' => 3500],
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

        // ── Employees ───────────────────────────────────────────────────────
        $employeesData = [
            ['first_name' => 'Marie',    'last_name' => 'Dupont',  'dept' => 'RH',  'pos' => 'RH01', 'salary' => 4200, 'email' => 'rh@niidpro.com',       'hire' => '2020-03-15'],
            ['first_name' => 'Jean',     'last_name' => 'Martin',  'dept' => 'IT',  'pos' => 'IT01', 'salary' => 5500, 'email' => 'manager@niidpro.com',   'hire' => '2019-06-01'],
            ['first_name' => 'Sophie',   'last_name' => 'Bernard', 'dept' => 'IT',  'pos' => 'IT02', 'salary' => 4000, 'hire' => '2021-09-01'],
            ['first_name' => 'Pierre',   'last_name' => 'Moreau',  'dept' => 'IT',  'pos' => 'IT03', 'salary' => 3800, 'hire' => '2022-01-15'],
            ['first_name' => 'Isabelle', 'last_name' => 'Laurent', 'dept' => 'FIN', 'pos' => 'FIN01','salary' => 6000, 'hire' => '2018-04-10'],
            ['first_name' => 'Thomas',   'last_name' => 'Simon',   'dept' => 'FIN', 'pos' => 'FIN02','salary' => 3200, 'hire' => '2022-07-01'],
            ['first_name' => 'Camille',  'last_name' => 'Michel',  'dept' => 'COM', 'pos' => 'COM01','salary' => 3800, 'hire' => '2021-03-20'],
            ['first_name' => 'Antoine',  'last_name' => 'Garcia',  'dept' => 'COM', 'pos' => 'COM02','salary' => 2900, 'hire' => '2023-02-01'],
            ['first_name' => 'Lucie',    'last_name' => 'Petit',   'dept' => 'RH',  'pos' => 'RH02', 'salary' => 2800, 'hire' => '2023-05-15'],
            ['first_name' => 'Nicolas',  'last_name' => 'Roux',    'dept' => 'IT',  'pos' => 'IT02', 'salary' => 4200, 'hire' => '2020-11-01'],
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
        $statuses = ['present', 'present', 'present', 'present', 'present', 'present', 'late', 'present', 'on_leave', 'absent'];
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
