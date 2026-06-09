<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveType;
use App\Models\Position;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
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

        // ── Employees ANASER ─────────────────────────────────────────────────
        $divRh = Department::where('code', 'DIV-RH')->first() ?? $daf;
        $depts = [
            'DG'      => $dg,    'SG'     => $sg,    'DEP'   => $dep,
            'DAC'     => $dac,   'DPSRC'  => $dpsrc, 'DDC'   => $ddc,
            'DAF'     => $daf,   'DAF-RH' => $divRh,
        ];

        $salaryByCat = [
            '11' => 850000, '10C' => 680000, '10A' => 520000,
            '9A' => 380000, '8C'  => 280000, '8B'  => 260000,
            '8A' => 240000, '7B'  => 200000, '6'   => 165000, '5' => 140000,
        ];

        // [matricule, nom, prénoms, sexe, dept, fonction, catégorie, hire(d/m/Y), email, nb_enfants]
        $employeesData = [
            ['0115','SY','ATOUMANE','M','DG','DIRECTEUR GENERAL','11','01/08/2024','a.sy@anaser.sn',4],
            ['0003','DIOP','BOUBACAR','M','SG','SECRETAIRE GENERAL','10C','01/04/2022','b.diop@anaser.sn',4],
            ['0121','BADJI','LAMINE','M','SG','SECRETAIRE GENERAL','10C','07/07/2025','l.badji@anaser.sn',2],
            ['0099','SALL','ALIOUNE','M','DAF','DIRECTEUR ADMINISTRATIF ET FINANCIER','10A','02/11/2023','a.sall@anaser.sn',6],
            ['0034','NDAO','IBRAHIMA','M','DEP','DIRECTEUR DES ETUDES ET DE LA PLANIFICATION','10A','15/05/2022','i.ndao@anaser.sn',6],
            ['0011','LY','OUSMANE','M','DAC','DIRECTEUR DE L\'AUDIT ET DE LA CONFORMITE','10A','01/03/2022','o.ly@anaser.sn',0],
            ['0098','MANE','LATIR','M','DPSRC','DIRECTEUR PROMOTION SR ET COMMUNICATION','10A','02/11/2023','l.mane@anaser.sn',4],
            ['0118','GUEYE','MOUHAMADOU MOUSTAPHA','M','DDC','DIRECTEUR DU DEVELOPPEMENT ET DE LA COOPERATION','10A','03/02/2025','m.gueye@anaser.sn',2],
            ['0005','SENE','BINETA','F','DG','CONSEILLERE TECHNIQUE','10A','01/03/2022','b.sene@anaser.sn',2],
            ['0004','ANNE','BAIDY','M','DG','AGENT COMPTABLE','10A','16/02/2022','b.anne@anaser.sn',3],
            ['0125','SAKHO','AIDA MALICK','F','DG','AGENT COMPTABLE','10A','20/01/2026','a.sakho@anaser.sn',2],
            ['0013','GUEYE','YAYE HINDOU','F','SG','COORD. CELLULE INFORMATIQUE ET INNOVATION','10A','01/04/2022','y.gueye@anaser.sn',3],
            ['0066','YOUM','MAME YATTE','F','DG','CONSEILLER TECHNIQUE','9A','15/05/2022','m.youm@anaser.sn',2],
            ['0116','THIAM','FAMA','F','DG','ASSISTANTE DG','8C','10/12/2024','f.thiam@anaser.sn',2],
            ['0081','DIOUF','FATOU','F','DG','ASSISTANTE DE DIRECTION','8C','01/09/2022','f.diouf@anaser.sn',0],
            ['0059','GUEYE','AISSATOU','F','DG','ASSISTANTE DE DIRECTION','8C','15/05/2022','a.gueye@anaser.sn',0],
            ['0018','MBODJI','ELHADJI MOUSSA','M','DG','COURSIER','5','01/03/2022','e.mbodji@anaser.sn',2],
            ['0019','MANGANE','MAMADOU','M','DG','CHAUFFEUR','5','01/02/2022','m.mangane@anaser.sn',3],
            ['0020','NGOM','ABDOULAYE DIA','M','DAF-RH','CHEF DIVISION RESSOURCES HUMAINES','9A','01/03/2022','a.ngom@anaser.sn',4],
            ['0021','TRAWARE','FATOUMATA SANO','F','DAF','CHEFFE DIVISION DES FINANCES','9A','01/04/2022','f.traware@anaser.sn',1],
            ['0102','HANE','YAYE FATOU NDIAYE','F','DAF','CHEFFE DIVISION MOYENS GENERAUX','9A','02/01/2024','y.hane@anaser.sn',0],
            ['0105','FALL','AMINATA','F','DAF','CHEFFE DE BUREAU DES FINANCES','9A','02/01/2024','a.fall@anaser.sn',1],
            ['0064','FALL','NDIOBA','F','DAF','CHEF BUREAU VERIFICATION ET PAIEMENT','8C','01/04/2022','n.fall@anaser.sn',0],
            ['0063','MBAYE','ABDOU','M','DAF','COMPTABLE','9A','15/05/2022','a.mbaye@anaser.sn',0],
            ['0025','DIOP','MAMADOU FAYE','M','DAF','AGENT TECHNIQUE','8B','01/04/2022','m.diop@anaser.sn',0],
            ['0024','FAYE','MAME DIARRA','F','DAF','AGENT TECHNIQUE','8B','01/04/2022','m.faye@anaser.sn',1],
            ['0052','FALL','MAISSA','F','DAF','CHEF DE BUREAU MOYENS GENERAUX','8A','15/05/2022','m.fall@anaser.sn',1],
            ['0106','SALL','SAYDOU OUSMANE','M','DAF','CHEF DE BUREAU','9A','02/01/2024','s.sall@anaser.sn',0],
            ['0109','GUEYE','COURA','F','DAF','AGENT TECHNIQUE','9A','02/01/2024','c.gueye@anaser.sn',0],
            ['0028','COLY','SADA','M','DAF','CHAUFFEUR','5','01/05/2022','s.coly@anaser.sn',2],
            ['0088','DIALLO','OUMAR','M','DAF','CHAUFFEUR','5','01/03/2023','o.diallo@anaser.sn',0],
            ['0120','DIAW','IDRISSA','M','DAF','MAGASINIER','6','15/05/2025','i.diaw@anaser.sn',2],
            ['0082','FALL','NDEYE FATOU','F','DAF','EMPLOYEE DU COURRIER','5','14/10/2022','nf.fall@anaser.sn',1],
            ['0123','GUEYE','SEYDOU','M','DAF','MAGASINIER','6','01/07/2025','s.gueye@anaser.sn',6],
            ['0060','SOUMARE','PAPE ABDOULAYE NIANG','M','DAF','CHAUFFEUR','5','15/05/2022','p.soumare@anaser.sn',1],
            ['0074','NIANG','DJIBRIL','M','DAF','CHAUFFEUR','5','08/06/2022','d.niang@anaser.sn',6],
            ['0080','SARR','OUMAR','M','DAF','CHAUFFEUR','5','01/09/2022','o.sarr@anaser.sn',2],
            ['0111','NDOUR','ALIOUNE BADARA','M','DAF','CHAUFFEUR','5','02/01/2024','a.ndour@anaser.sn',2],
            ['0117','SOW','ISMAILA','M','DAF','CHAUFFEUR','5','01/07/2025','i.sow@anaser.sn',2],
            ['0023','DIA','HAWA','F','DAF-RH','AGENT TECHNIQUE','8B','01/04/2022','h.dia@anaser.sn',1],
            ['0057','NDIAYE','KHADIDIATOU','F','DAF-RH','AGENT ADMINISTRATIF','8C','15/05/2022','k.ndiaye@anaser.sn',1],
            ['0047','DIALLO','ALASSANE','M','DAF-RH','AGENT ADMINISTRATIF','7B','15/05/2022','al.diallo@anaser.sn',0],
            ['0036','DIOUM','AIDA','F','DAF-RH','AGENT ADMINISTRATIF','7B','15/05/2022','a.dioum@anaser.sn',3],
            ['0049','SOW','FATOU BINTOU','F','DAF-RH','AGENT ADMINISTRATIF','7B','15/05/2022','f.sow@anaser.sn',0],
            ['0044','BADIANE','FATOU MBAYE','F','DAF-RH','AGENT ADMINISTRATIF','7B','15/05/2022','f.badiane@anaser.sn',0],
            ['0100','TALL','MOHAMED EL HABIB','M','DEP','CHEF DIV. OBSERVATOIRE SR','9A','02/01/2024','m.tall@anaser.sn',0],
            ['0029','DIOUF','SIMON','M','DEP','CHEF DIV. ETUDES ET PLANIFICATION','10A','15/05/2022','s.diouf@anaser.sn',3],
            ['0026','BA','MOUSTAPHA','M','DEP','ECONOMISTE','10A','15/05/2022','m.ba@anaser.sn',3],
            ['0072','DIAO','SIDY','M','DEP','CHEF DE POLE','9A','01/06/2022','s.diao@anaser.sn',0],
            ['0054','FALL','OUSMANE','M','DEP','AGENT TECHNIQUE','8C','15/05/2022','o.fall@anaser.sn',0],
            ['0095','DIENG','MAME DIARRA','F','DEP','AGENT TECHNIQUE','8C','03/07/2023','md.dieng@anaser.sn',1],
            ['0078','DIATTA','MARIE SOPHIE CHANTAL','F','DEP','CHEF DE BUREAU','8C','01/07/2022','m.diatta@anaser.sn',0],
            ['0037','DIENG','AMINATA','F','DEP','CHEF DE BUREAU','8A','15/05/2022','a.dieng@anaser.sn',2],
            ['0027','DIOP','YOUSSOUPHA KEBA','M','DEP','AGENT TECHNIQUE','8B','01/04/2022','y.diop@anaser.sn',0],
            ['0071','DIOP','MAMADOU','M','DEP','CHEF DE BUREAU','8C','01/06/2022','md.diop@anaser.sn',0],
            ['0069','NIANG','MAME MBAYANG','F','DEP','CHEF DE BUREAU','8C','01/06/2022','mm.niang@anaser.sn',1],
            ['0030','FALL','HAMETH','M','DAC','CHEF DIV. AUDIT ET HOMOLOGATION INFRA.','9A','15/05/2022','h.fall@anaser.sn',0],
            ['0083','BASSE','FRANCOIS YEDIME','M','DAC','JURISTE','9A','01/11/2022','f.basse@anaser.sn',1],
            ['0076','DIEME','HAMETH','M','DAC','AGENT TECHNIQUE','8A','01/07/2022','h.dieme@anaser.sn',2],
            ['0065','DIOUF','OULEYMATOU','F','DAC','CHEF DE BUREAU','8C','01/04/2022','o.diouf@anaser.sn',0],
            ['0073','MANE','NDEYE CIRA','F','DAC','AGENT VERIFICATEUR','8A','08/06/2022','n.mane@anaser.sn',2],
            ['0092','SARR','DAOUDA SINGUY','M','DAC','INGENIEUR DES TRANSPORTS','9A','01/03/2023','d.sarr@anaser.sn',1],
            ['0084','DIOUF','AMDY MOUSTAPHA','M','DAC','AGENT TECHNIQUE','8C','02/01/2023','am.diouf@anaser.sn',0],
            ['0107','NDIAYE','CHEIKH','M','DAC','AGENT TECHNIQUE','9A','02/01/2024','c.ndiaye@anaser.sn',2],
            ['0112','NDIAYE','DIE','F','DAC','AGENT TECHNIQUE','8C','02/01/2024','d.ndiaye@anaser.sn',0],
            ['0075','THIAM','KHOUDIA','F','DAC','AGENT TECHNIQUE','8C','01/07/2022','k.thiam@anaser.sn',1],
            ['0070','WANE','AMATH BOCAR','M','DPSRC','CHEF DIV. COMMUNICATION ET SENSIBILISATION','9A','15/05/2022','a.wane@anaser.sn',2],
            ['0061','FALL','BASSIROU','M','DPSRC','CHEF DIV. EDUCATION ET PREVENTION','9A','15/05/2022','b.fall@anaser.sn',3],
            ['0068','KAMARA','ADJA MAMADY','F','DPSRC','CHEF BUREAU COMMUNICATION ET EVENEMENTIEL','7B','15/06/2022','a.kamara@anaser.sn',1],
            ['0053','DIALLO','NDEYE FATOU','F','DPSRC','CHEF DE BUREAU PARTENARIAT','9A','15/05/2022','n.diallo@anaser.sn',1],
            ['0096','FAYE','HADJA ROKHAYA','F','DPSRC','CHEF BUREAU EDUC. ET PREVENTION ROUTIERE','9A','01/08/2023','h.faye@anaser.sn',0],
            ['0046','FOFANA','MAYMOUNA','F','DPSRC','CHEF DE POLE','9A','15/05/2022','m.fofana@anaser.sn',3],
            ['0038','SOW','PAPA ALY','M','DPSRC','CHEF DIV. REGULATION DES COMPORTEMENTS','9A','15/05/2022','p.sow@anaser.sn',1],
            ['0113','LOUM','MAPENDA','M','DPSRC','AGENT CELLULE REGULATION COMPORTEMENT','9A','01/02/2024','m.loum@anaser.sn',3],
            ['0079','DIOP','ALIMATOU SADIYA','F','DPSRC','AGENT TECHNIQUE','8C','01/08/2022','a.diop@anaser.sn',2],
            ['0086','NDIAYE','NDEYE AISSATOU','F','DPSRC','AGENT TECHNIQUE','7B','15/05/2022','na.ndiaye@anaser.sn',0],
            ['0035','SANGARE','MAGNEFE','F','DPSRC','AGENT TECHNIQUE','7B','15/05/2022','m.sangare@anaser.sn',1],
            ['0051','NIANG','MAKHA','M','DPSRC','AGENT TECHNIQUE','8A','15/05/2022','mk.niang@anaser.sn',2],
            ['0062','GAYE','MACOURA','F','DDC','CHEF DIV. DEPLOIEMENT TERRITORIAL','9A','15/05/2022','m.gaye@anaser.sn',5],
            ['0094','DIALLO','AMADY','M','DDC','SPECIALISTE QHSE','9A','05/06/2023','am.diallo@anaser.sn',6],
            ['0085','SECK','MOUHAMMAD KEBIR','M','DDC','CHEF DE POLE','9A','02/01/2023','m.seck@anaser.sn',0],
            ['0108','SENGHOR','IBRAHIMA','M','DDC','CHEF DE POLE','9A','02/01/2024','i.senghor@anaser.sn',1],
            ['0050','NDIAYE','PAPA AHAD','M','DDC','CHEF DE POLE','8A','15/05/2022','p.ndiaye@anaser.sn',4],
            ['0048','SIDIBE','ASSANE','M','DDC','CHEF DE POLE','8C','15/05/2022','a.sidibe@anaser.sn',2],
            ['0101','NGOM','IBRAHIMA','M','DDC','AGENT TECHNIQUE','8C','02/01/2024','i.ngom@anaser.sn',0],
            ['0104','NIANG','AMINATA SENE','F','DDC','AGENT TECHNIQUE','8C','02/01/2024','as.niang@anaser.sn',0],
            ['0090','AIDARA','DIEYNABA','F','SG','CHEF DE BUREAU','9A','01/03/2023','d.aidara@anaser.sn',1],
            ['0056','BA','OULEYE CIRE','F','SG','CHEF DE BUREAU RECOUVREMENT','9A','15/05/2022','o.ba@anaser.sn',0],
            ['0055','BA','ASS MALICK','M','SG','CHEF DE POLE','9A','15/05/2022','a.ba@anaser.sn',1],
            ['0093','BAKHOUM','NDEYE NGONE','F','SG','ASSISTANTE DE DIRECTION','8C','01/03/2023','n.bakhoum@anaser.sn',5],
            ['0017','CISSOKHO','AISSATOU SOUKEYNA','F','SG','ASSISTANTE DE DIRECTION','8C','01/04/2022','a.cissokho@anaser.sn',1],
            ['0022','DIATTA','IBRAHIMA','M','SG','COORD. CELLULE PASSATION DES MARCHES','9A','01/03/2022','i.diatta@anaser.sn',4],
            ['0033','DIOP','MANSOUR','M','SG','COORD. CELLULE CONTROLE INTERNE','9A','15/05/2022','man.diop@anaser.sn',2],
            ['0031','SENE','PAPA ALBOURY','M','SG','COORD. CELLULE CONTROLE GESTION','9A','15/05/2022','p.sene@anaser.sn',0],
            ['0087','NDIAYE','BIGUE','F','SG','COORD. CELLULE POST-ACCIDENTOLOGIE','9A','01/02/2023','b.ndiaye@anaser.sn',3],
            ['0041','DIAW','NDEYE SEYNABOU','F','SG','RESP. BUREAU SUIVI-EVALUATION','9A','15/05/2022','n.diaw@anaser.sn',0],
            ['0091','FALL','BABACAR','M','SG','CHEF DIV. INFORMATIQUE ET INNOVATION','9A','01/03/2023','bab.fall@anaser.sn',2],
            ['0124','SY','SOULEYMANE DEMBA','M','SG','COORD. CELLULE SUIVI-EVALUATION','9A','11/08/2025','s.sy@anaser.sn',4],
            ['0042','DIOP','ROKHAYA','F','SG','INFORMATICIENNE','8B','15/05/2022','r.diop@anaser.sn',2],
            ['0110','SOW','MOUCTAR','M','SG','EMPLOYE DE COURRIER','8A','02/01/2024','m.sow@anaser.sn',2],
            ['0039','SYLLA','SALIMATA','F','SG','CHEFFE BUREAU COURRIER ET ARCHIVES','9A','15/05/2022','s.sylla@anaser.sn',0],
            ['0067','SOGUE','AISSATA','F','SG','SECRETAIRE','8A','01/06/2022','a.sogue@anaser.sn',0],
            ['0015','SENE','ADJA MAIMOUNA','F','SG','SECRETAIRE','6','01/04/2022','a.sene@anaser.sn',3],
            ['0122','SY','MARIEME','F','SG','SECRETAIRE DE DIRECTION','8C','01/07/2025','m.sy@anaser.sn',0],
        ];

        foreach ($employeesData as [$mat, $nom, $prenom, $sexe, $dept, $fonction, $cat, $hire, $email, $enfants]) {
            $deptModel = $depts[$dept];
            $salary    = $salaryByCat[$cat] ?? 200000;
            $hireDate  = Carbon::createFromFormat('d/m/Y', $hire)->toDateString();

            $position = Position::firstOrCreate(
                ['title' => $fonction, 'department_id' => $deptModel->id],
                [
                    'base_salary_min' => (int) ($salary * 0.85),
                    'base_salary_max' => (int) ($salary * 1.15),
                ]
            );

            Employee::firstOrCreate(['employee_number' => $mat], [
                'first_name'            => $prenom,
                'last_name'             => $nom,
                'gender'                => $sexe,
                'department_id'         => $deptModel->id,
                'position_id'           => $position->id,
                'professional_email'    => $email,
                'hire_date'             => $hireDate,
                'base_salary'           => $salary,
                'status'                => 'active',
                'nationality'           => 'Sénégalaise',
                'country'               => 'Sénégal',
                'city'                  => 'Dakar',
                'nombre_enfants_charge' => $enfants,
                'nbre_jour_conge'       => 2,
            ]);
        }

        // ── Document Templates ──────────────────────────────────────────────
        $this->call(DocumentTemplateSeeder::class);

        // ── Training Module ──────────────────────────────────────────────────
        $this->call(TrainingSeeder::class);

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
