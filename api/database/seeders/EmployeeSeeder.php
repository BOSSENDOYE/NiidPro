<?php

namespace Database\Seeders;

use App\Models\Contract;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        // ── Départements existants (refs pour création des nouveaux) ─────────
        $dgModel  = Department::where('code', 'DG')->first();
        $sgModel  = Department::where('code', 'SG')->first();
        $ddcModel = Department::where('code', 'DDC')->first();
        $dafModel = Department::where('code', 'DAF')->first();

        // ── Nouveaux départements ─────────────────────────────────────────────
        Department::firstOrCreate(['code' => 'AC'], [
            'name'        => 'Agence Comptable',
            'description' => 'Comptabilité publique et gestion financière',
            'parent_id'   => $dgModel->id,
            'color'       => '#475569',
            'is_active'   => true,
        ]);

        Department::firstOrCreate(['code' => 'CII'], [
            'name'        => 'Cellule Informatique et Innovation',
            'description' => "Systèmes d'information et innovation numérique",
            'parent_id'   => $sgModel->id,
            'color'       => '#0891B2',
            'is_active'   => true,
        ]);

        // Pôles territoriaux (rattachés à la DDC)
        $poles = [
            'POLE-DKR'  => 'Pôle Dakar',
            'POLE-NORD' => 'Pôle Nord',
            'POLE-CTR'  => 'Pôle Centre',
            'POLE-DIOU' => 'Pôle Diourbel/Louga',
            'POLE-SUD'  => 'Pôle Sud',
            'POLE-THIS' => 'Pôle Thiès',
            'POLE-TAMBA'=> 'Pôle Tambacounda',
        ];
        foreach ($poles as $code => $name) {
            Department::firstOrCreate(['code' => $code], [
                'name'      => $name,
                'description' => 'Pôle territorial',
                'parent_id' => $ddcModel->id,
                'color'     => '#2563EB',
                'is_active' => true,
            ]);
        }

        // ── Reload de tous les IDs de départements ────────────────────────────
        $depts = Department::pluck('id', 'code');

        // ── Nouvelles positions ───────────────────────────────────────────────
        $newPositions = [
            ['title' => 'Président du Conseil de Surveillance', 'code' => 'P-CS',       'department_id' => $depts['CS'],  'base_salary_min' => 800000, 'base_salary_max' => 1200000],
            ['title' => 'Conseiller(ère) Technique',            'code' => 'P-CONSTECH', 'department_id' => $depts['DG'],  'base_salary_min' => 300000, 'base_salary_max' => 500000],
            ['title' => 'Chef de Bureau',                       'code' => 'P-CHEF-BUR', 'department_id' => $depts['SG'],  'base_salary_min' => 250000, 'base_salary_max' => 380000],
            ['title' => 'Coursier',                             'code' => 'P-COURSIER', 'department_id' => $depts['DG'],  'base_salary_min' => 150000, 'base_salary_max' => 200000],
            ['title' => 'Chauffeur',                            'code' => 'P-CHAUFFEUR','department_id' => $depts['DG'],  'base_salary_min' => 160000, 'base_salary_max' => 220000],
            ['title' => 'Réceptionniste',                       'code' => 'P-RECEPT',   'department_id' => $depts['DG'],  'base_salary_min' => 160000, 'base_salary_max' => 200000],
            ['title' => 'Économiste',                           'code' => 'P-ECON',     'department_id' => $depts['DG'],  'base_salary_min' => 280000, 'base_salary_max' => 420000],
            ['title' => 'Coordonnateur de Cellule',             'code' => 'P-COORD',    'department_id' => $depts['SG'],  'base_salary_min' => 300000, 'base_salary_max' => 450000],
            ['title' => 'Secrétaire',                           'code' => 'P-SECR',     'department_id' => $depts['SG'],  'base_salary_min' => 180000, 'base_salary_max' => 250000],
            ['title' => 'Agent Comptable',                      'code' => 'P-ACC',      'department_id' => $depts['AC'],  'base_salary_min' => 350000, 'base_salary_max' => 550000],
            ['title' => 'Agent Technique',                      'code' => 'P-AGT-TECH', 'department_id' => $depts['DDC'], 'base_salary_min' => 200000, 'base_salary_max' => 320000],
            ['title' => 'Agent Administratif',                  'code' => 'P-AGT-ADM',  'department_id' => $depts['DAF'], 'base_salary_min' => 180000, 'base_salary_max' => 280000],
            ['title' => 'Magasinier',                           'code' => 'P-MAGASIN',  'department_id' => $depts['DAF'], 'base_salary_min' => 160000, 'base_salary_max' => 220000],
            ['title' => 'Chef de Pôle',                         'code' => 'P-CH-POLE',  'department_id' => $depts['DDC'], 'base_salary_min' => 300000, 'base_salary_max' => 450000],
        ];

        foreach ($newPositions as $p) {
            Position::firstOrCreate(['code' => $p['code']], $p);
        }

        // ── Reload de tous les IDs de positions ───────────────────────────────
        $positions = Position::pluck('id', 'code');

        // ── Agents ANASER — colonnes: [matr, prénom, nom, dept, poste, contrat, sexe] ─
        $agents = [
            // ── PRÉSIDENCE DU CONSEIL DE SURVEILLANCE ──────────────────────────
            [null,      'Boubacar',                     'SADIO',   'CS',        'P-CS',       'DECRET',      'M'],
            ['0081',    'Fatou',                        'DIOUF',   'CS',        'P-AD',       'CDI',         'F'],
            ['0080',    'Oumar',                        'SARR',    'CS',        'P-CHAUFFEUR','CDI',         'M'],

            // ── DIRECTION GÉNÉRALE ──────────────────────────────────────────────
            ['0115',    'Atoumane',                     'SY',      'DG',        'P-DG',       'DECRET',      'M'],
            ['0005',    'Bineta',                       'SENE',    'DG',        'P-CONSTECH', 'CDI',         'F'],
            ['0039',    'Salimata',                     'SYLLA',   'DG',        'P-CHEF-BUR', 'CDI',         'F'],
            ['0018',    'ElHadji Moussa',               'MBODJI',  'DG',        'P-COURSIER', 'CDI',         'M'],
            ['0117',    'Ismaila',                      'SOW',     'DG',        'P-CHAUFFEUR','CDI',         'M'],
            ['0119',    'Houraye',                      'BARRO',   'DG',        'P-RECEPT',   'CDI',         'F'],
            ['0127',    'Marième',                      'SY',      'DG',        'P-AD',       'CDI',         'F'],
            ['0026',    'Moustapha',                    'BA',      'DG',        'P-ECON',     'CDI',         'M'],
            ['0036',    'Aida',                         'DIOUM',   'DG',        null,         'CDI',         'F'],
            ['0031',    'Pape Alboury',                 'SENE',    'DG',        'P-COORD',    'CDI',         'M'],

            // ── SECRÉTARIAT GÉNÉRAL ─────────────────────────────────────────────
            ['0121',    'Lamine',                       'BADJI',   'SG',        'P-SG',       'DECRET',      'M'],
            ['0033',    'Mansour',                      'DIOP',    'SG',        'P-COORD',    'CDI',         'M'],
            ['0087',    'Bigué',                        'NDIAYE',  'SG',        'P-COORD',    'CDI',         'F'],
            ['0038',    'Papa Aly',                     'SOW',     'SG',        'P-COORD',    'CDI',         'M'],
            ['0015',    'Adja Maïmouna',                'SENE',    'SG',        'P-SECR',     'CDI',         'F'],
            ['0113',    'Mapenda',                      'LOUM',    'SG',        'P-CHEF-BUR', 'DETACHEMENT', 'M'],
            ['0028',    'Sada',                         'COLY',    'SG',        'P-CHAUFFEUR','CDI',         'M'],
            [null,      'Maymouna',                     'FOFANA',  'SG',        'P-COORD',    'CDI',         'F'],
            ['0017',    'Aissatou Soukeyna Elisabeth',  'SISSOKHO','SG',        null,         'CDI',         'F'],

            // ── AGENCE COMPTABLE ────────────────────────────────────────────────
            ['0125',    'Aïda Malick',                  'SAKHO',   'AC',        'P-ACC',      'DETACHEMENT', 'M'],
            ['0064',    'Ndioba',                       'FALL',    'AC',        'P-CHEF-BUR', 'CDI',         'F'],
            ['0056',    'Ouleye Ciré',                  'BA',      'AC',        'P-CHEF-BUR', 'CDI',         'F'],

            // ── DIRECTION DE L'AUDIT ET DE LA CONFORMITÉ ────────────────────────
            ['0011',    'Ousmane',                      'LY',      'DAC',       'P-DAC',      'DETACHEMENT', 'M'],
            ['0030',    'Ameth',                        'FALL',    'DAC',       'P-DAHI',     'CDI',         'M'],

            // ── DIRECTION DES ÉTUDES ET DE LA PLANIFICATION ─────────────────────
            ['0034',    'Ibrahima',                     'NDAO',    'DEP',       'P-DEP',      'CDI',         'M'],
            ['0029',    'Simon',                        'DIOUF',   'DEP',       'P-EP',       'CDI',         'M'],
            ['0100',    'Mohamed El Habib',             'TALL',    'DEP',       'P-ODSR',     'CDI',         'M'],
            ['0093',    'Ndeye Ngoné',                  'BAKHOUM', 'DEP',       'P-AD',       'CDI',         'F'],

            // ── DIRECTION DE LA PROMOTION DE LA SÉCURITÉ ROUTIÈRE ET DE LA COMMUNICATION ─
            ['0128',    'Mohamadou Moustapha',          'GUEYE',   'DPSRC',     'P-DPSRC',    'CDI',         'M'],
            ['0061',    'Bassirou',                     'FALL',    'DPSRC',     'P-EPR',      'CDI',         'M'],

            // ── CELLULE INFORMATIQUE ET INNOVATION ──────────────────────────────
            ['0013',    'Yaye Hindou',                  'GUEYE',   'CII',       'P-COORD',    'CDI',         'F'],
            ['0091',    'Babacar',                      'FALL',    'CII',       null,         'CDI',         'M'],
            ['0071',    'Mamadou',                      'DIOP',    'CII',       'P-CHEF-BUR', 'CDI',         'M'],

            // ── DIRECTION ADMINISTRATIVE ET FINANCIÈRE ──────────────────────────
            ['0099',    'Alioune',                      'SALL',    'DAF',       'P-DAF',      'DETACHEMENT', 'M'],
            ['0021',    'Fatoumata Sano',               'TRAWARE', 'DAF',       'P-FIN',      'CDI',         'F'],
            ['0102',    'Yaye Fatou Ndiaye',            'HANE',    'DAF',       null,         'CDI',         'F'],
            ['0105',    'Aminata',                      'FALL',    'DAF',       null,         'CDI',         'F'],
            ['0109',    'Coura',                        'GUEYE',   'DAF',       'P-AGT-TECH', 'CDI',         'F'],
            ['0084',    'Amdy Moustapha',               'DIOUF',   'DAF',       null,         'CDI',         'M'],
            ['0057',    'Khadidiatou',                  'NDIAYE',  'DAF',       'P-AGT-ADM',  'CDI',         'F'],
            ['0067',    'Aissata',                      'SOGUE',   'DAF',       null,         'CDI',         'F'],
            ['0120',    'Idrissa',                      'DIAW',    'DAF',       'P-MAGASIN',  'CDD',         'M'],
            ['0126',    'Seydou',                       'GUEYE',   'DAF',       'P-MAGASIN',  'CDI',         'M'],
            ['0066',    'Mame Yatté',                   'YOUM',    'DAF',       'P-RH',       'CDI',         'M'],

            // ── DIRECTION DU DÉVELOPPEMENT ET DE LA COOPÉRATION ─────────────────
            ['0098',    'Latir',                        'MANE',    'DDC',       'P-DDC',      'CDI',         'M'],
            ['0062',    'Macoura',                      'GAYE',    'DDC',       'P-DT',       'CDI',         'M'],

            // ── PÔLE DAKAR ──────────────────────────────────────────────────────
            ['0086',    'Ndeye Aissatou',               'NDIAYE',  'POLE-DKR',  'P-AGT-TECH', 'CDI',         'F'],
            ['0041',    'Ndéye Seynabou',               'DIAW',    'POLE-DKR',  'P-AGT-TECH', 'CDI',         'F'],
            ['0095',    'Mame Diarra',                  'DIENG',   'POLE-DKR',  'P-AGT-TECH', 'CDI',         'F'],
            ['0079',    'Alimatou Sadiya',              'DIOP',    'POLE-DKR',  'P-AGT-TECH', 'CDI',         'F'],
            ['0069',    'Mama Mbayang',                 'NIANG',   'POLE-DKR',  'P-AGT-TECH', 'CDI',         'F'],
            ['0019',    'Mamadou',                      'MANGANE', 'POLE-DKR',  'P-CHAUFFEUR','CDI',         'M'],

            // ── PÔLE NORD ───────────────────────────────────────────────────────
            ['0072',    'Sidy',                         'DIAO',    'POLE-NORD', 'P-CH-POLE',  'CDI',         'M'],
            ['0044',    'Fatou Mbaye',                  'BADIANE', 'POLE-NORD', 'P-AGT-TECH', 'CDI',         'F'],
            ['0053',    'Ndèye Fatou',                  'DIALLO',  'POLE-NORD', 'P-AGT-TECH', 'CDI',         'F'],
            ['0088',    'Oumar',                        'DIALLO',  'POLE-NORD', 'P-CHAUFFEUR','CDI',         'M'],
            ['0035',    'Magnefé',                      'SANGARE', 'POLE-NORD', 'P-AGT-TECH', 'CDI',         'F'],
            ['0107',    'Cheikh',                       'NDIAYE',  'POLE-NORD', 'P-AGT-TECH', 'CDI',         'M'],
            ['0096',    'Hadja Rokhaya',                'FAYE',    'POLE-NORD', 'P-AGT-TECH', 'CDI',         'F'],
            ['0037',    'Aminata',                      'DIENG',   'POLE-NORD', 'P-AGT-TECH', 'CDI',         'F'],

            // ── PÔLE CENTRE ─────────────────────────────────────────────────────
            ['0055',    'Ass Malick',                   'BA',      'POLE-CTR',  'P-CH-POLE',  'CDI',         'M'],
            ['0049',    'Fatou Bintou',                 'SOW',     'POLE-CTR',  'P-AGT-TECH', 'CDI',         'F'],
            ['0112',    'Dié',                          'NDIAYE',  'POLE-CTR',  'P-AGT-TECH', 'CDI',         'F'],
            ['0051',    'Makha',                        'NIANG',   'POLE-CTR',  'P-AGT-TECH', 'CDI',         'M'],
            ['0101',    'Ibrahima',                     'NGOM',    'POLE-CTR',  'P-AGT-TECH', 'CDI',         'M'],
            ['0111',    'Alioune Badara',               'NDOUR',   'POLE-CTR',  'P-CHAUFFEUR','CDI',         'M'],
            ['0042',    'Rokhaya',                      'DIOP',    'POLE-CTR',  'P-AGT-TECH', 'CDI',         'F'],
            ['0075',    'Khoudia',                      'THIAM',   'POLE-CTR',  'P-AGT-TECH', 'CDI',         'F'],

            // ── PÔLE DIOURBEL/LOUGA ─────────────────────────────────────────────
            ['0108',    'Ibrahima',                     'SENGHOR', 'POLE-DIOU', 'P-CH-POLE',  'CDI',         'M'],
            ['0059',    'Aissatou',                     'GUEYE',   'POLE-DIOU', 'P-AD',       'CDI',         'F'],
            ['0077',    'Amadou Moussa',                'DIALLO',  'POLE-DIOU', 'P-AGT-TECH', 'CDI',         'M'],
            ['0027',    'Youssoupha Keba',              'DIOP',    'POLE-DIOU', null,         'CDI',         'M'],
            ['0060',    'Pape Abdoulaye Niang',         'SOUMARE', 'POLE-DIOU', 'P-CHAUFFEUR','CDI',         'M'],
            ['0023',    'Hawa',                         'DIA',     'POLE-DIOU', 'P-AGT-TECH', 'CDI',         'F'],
            ['0082',    'Ndeye Fatou',                  'FALL',    'POLE-DIOU', 'P-AGT-TECH', 'CDI',         'F'],

            // ── PÔLE SUD ────────────────────────────────────────────────────────
            ['0050',    'Papa A C Ahab',                'NDIAYE',  'POLE-SUD',  'P-CH-POLE',  'CDI',         'M'],
            ['0076',    'Hameth',                       'DIEME',   'POLE-SUD',  'P-AGT-TECH', 'CDI',         'M'],
            ['0025',    'Mamadou Faye',                 'DIOP',    'POLE-SUD',  'P-AGT-TECH', 'CDI',         'M'],
            ['0054',    'Ousmane',                      'FALL',    'POLE-SUD',  'P-AGT-TECH', 'CDI',         'M'],
            ['0074',    'Djibril',                      'NIANG',   'POLE-SUD',  'P-CHAUFFEUR','CDI',         'M'],
            [null,      'Marie Sophie Chantal',         'DIATTA',  'POLE-SUD',  'P-AGT-TECH', 'CDI',         'F'],
            [null,      'Amath Bocar',                  'WANE',    'POLE-SUD',  'P-AGT-TECH', 'CDI',         'M'],
            [null,      'Mouctar',                      'SOW',     'POLE-SUD',  'P-AGT-TECH', 'CDI',         'M'],

            // ── PÔLE THIÈS ──────────────────────────────────────────────────────
            ['0085',    'Mouhammad Kebir',              'SECK',    'POLE-THIS', 'P-CH-POLE',  'CDI',         'M'],
            ['0047',    'Alassane',                     'DIALLO',  'POLE-THIS', 'P-AGT-TECH', 'CDI',         'M'],
            ['0065',    'Ouleymatou',                   'DIOUF',   'POLE-THIS', 'P-AGT-TECH', 'CDI',         'F'],
            ['0063',    'Maissa',                       'FALL',    'POLE-THIS', 'P-AGT-TECH', 'CDI',         'M'],
            [null,      'Aminata Sène',                 'NIANG',   'POLE-THIS', 'P-AGT-TECH', 'CDI',         'F'],
            ['0073',    'Ndeye Sira',                   'MANE',    'POLE-THIS', 'P-AGT-TECH', 'CDI',         'F'],
            ['0068',    'Adjia Mamady',                 'KAMARA',  'POLE-THIS', 'P-AGT-TECH', 'CDI',         'F'],
            ['0024',    'Mame Diarra',                  'FAYE',    'POLE-THIS', 'P-AGT-TECH', 'CDI',         'F'],

            // ── PÔLE TAMBACOUNDA ─────────────────────────────────────────────────
            [null,      'Assane',                       'SIDIBE',  'POLE-TAMBA','P-CH-POLE',  'CDI',         'M'],
        ];

        foreach ($agents as [$matr, $firstName, $lastName, $deptCode, $posCode, $contractType, $gender]) {
            $data = [
                'first_name'    => $firstName,
                'last_name'     => $lastName,
                'gender'        => $gender,
                'department_id' => $depts[$deptCode] ?? null,
                'position_id'   => $posCode ? ($positions[$posCode] ?? null) : null,
                'hire_date'     => '2018-01-01',
                'status'        => 'active',
                'country'       => 'Sénégal',
                'employee_number' => $matr,
            ];

            // Pour les agents sans matricule, on cherche par prénom+nom pour éviter les doublons
            if ($matr !== null) {
                $emp = Employee::firstOrCreate(['employee_number' => $matr], $data);
            } else {
                $emp = Employee::firstOrCreate(
                    ['first_name' => $firstName, 'last_name' => $lastName],
                    $data
                );
            }

            Contract::firstOrCreate(
                ['employee_id' => $emp->id, 'is_active' => true],
                [
                    'type'       => in_array($contractType, ['CDI', 'CDD', 'DECRET', 'DETACHEMENT', 'Stage', 'Alternance', 'Prestation']) ? $contractType : 'Autre',
                    'start_date' => '2018-01-01',
                    'is_active'  => true,
                ]
            );
        }

        // ── Agents sortis (ex-personnel) ─────────────────────────────────────
        $sortis = [
            ['Ndella',            'DIOP'],
            ['Amadou',            'DIOP'],
            ['Ousseynou',         'TALL'],
            ['Oumar',             'TOURE'],
            ['Abdoulaye Dia',     'NGOM'],
            ['Abdou',             'MBAYE'],
            ['Ibrahima',          'DIATTA'],
            ['Daouda Siguy',      'SARR'],
            ['Baïdy',             'ANNE'],
            ['Yaya Samba',        'NIANG'],
            ['Coura',             'COULIBALY'],
            ['Boubacar',          'DIOP'],
            ['Fama',              'THIAM'],
            ['Amady',             'DIALLO'],
            ['Fallou',            'GUEYE'],
            ['Pape Momar Niang',  'BABY'],
            ['Aly Mbaye',         'THIAM'],
            ['Alioune',           'CAMARA'],
            ['Cheikhou Oumar',    'GAYE'],
            ['Firmin René',       'COLY'],
            ['Mame Abdou Aziz',   'BA'],
            ['Ndeye Awa',         'SARR'],
            ['Adjia Oulimata',    'DIALLO'],
            ['Fodé',              'DIEME'],
            ['Mamadou',           'DIOP'],
            ['Oureye',            'THIAM'],
        ];

        foreach ($sortis as [$firstName, $lastName]) {
            Employee::firstOrCreate(
                ['first_name' => $firstName, 'last_name' => $lastName, 'status' => 'terminated'],
                [
                    'employee_number' => null,
                    'hire_date'       => '2018-01-01',
                    'status'          => 'terminated',
                    'country'         => 'Sénégal',
                ]
            );
        }

        $actifs  = Employee::where('status', 'active')->count();
        $sortisC = Employee::where('status', 'terminated')->count();
        $this->command->info("✓ $actifs agents actifs + $sortisC agents sortis importés.");
    }
}
