<?php

namespace Database\Seeders;

use App\Models\OrganisationUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrganisationUnitSeeder extends Seeder
{
    public function run(): void
    {
        // TRUNCATE fait un commit implicite en MySQL — hors transaction
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        OrganisationUnit::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $ids = [];

            $entities = [
                // --- Niveau 0 : gouvernance ---
                ['code' => 'ORG-CS',   'libelle' => 'Conseil de surveillance',                                          'type' => 'gouvernance', 'niveau' => 0, 'parent' => null],
                ['code' => 'ORG-DG',   'libelle' => 'Direction Générale',                                               'type' => 'gouvernance', 'niveau' => 0, 'parent' => 'ORG-CS'],
                ['code' => 'ORG-SG',   'libelle' => 'Secrétariat Général',                                              'type' => 'gouvernance', 'niveau' => 0, 'parent' => 'ORG-DG'],

                // --- Rattachées au Conseil de surveillance ---
                ['code' => 'CS-AD',    'libelle' => 'Assistante de direction',                                          'type' => 'appui',      'niveau' => 1, 'parent' => 'ORG-CS'],

                // --- Rattachées directement à la Direction Générale ---
                ['code' => 'DG-AC',    'libelle' => 'Agence Comptable',                                                 'type' => 'appui',      'niveau' => 1, 'parent' => 'ORG-DG'],
                ['code' => 'DG-CT',    'libelle' => 'Conseillers techniques',                                           'type' => 'appui',      'niveau' => 1, 'parent' => 'ORG-DG'],
                ['code' => 'DG-CG',    'libelle' => 'Contrôleur de gestion',                                            'type' => 'appui',      'niveau' => 1, 'parent' => 'ORG-DG'],
                ['code' => 'DG-AD',    'libelle' => 'Assistantes de direction',                                         'type' => 'appui',      'niveau' => 1, 'parent' => 'ORG-DG'],

                // --- Cellules rattachées au Secrétariat Général ---
                ['code' => 'SG-CPM',   'libelle' => 'Cellule Passation des Marchés',                                   'type' => 'cellule',    'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'SG-CPA',   'libelle' => 'Cellule Post-Accidentologie',                                      'type' => 'cellule',    'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'SG-CLAJ',  'libelle' => 'Cellule de Législation des Affaires Juridiques',                  'type' => 'cellule',    'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'SG-CRC',   'libelle' => 'Cellule Régulation des comportements',                             'type' => 'cellule',    'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'SG-CCI',   'libelle' => 'Cellule Contrôle Interne',                                         'type' => 'cellule',    'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'SG-CSE',   'libelle' => 'Cellule Suivi-évaluation',                                         'type' => 'cellule',    'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'SG-CII',   'libelle' => 'Cellule Informatique et Innovation',                               'type' => 'cellule',    'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'SG-QHSE',  'libelle' => 'Cellule Qualité Hygiène Sécurité et Environnement',               'type' => 'cellule',    'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'SG-AD',    'libelle' => 'Assistante de Direction',                                          'type' => 'appui',      'niveau' => 1, 'parent' => 'ORG-SG'],

                // --- Directions métier ---
                ['code' => 'DEP',      'libelle' => 'Direction des Études et de la Planification',                      'type' => 'direction',  'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'DAC',      'libelle' => "Direction de l'Audit et de la Conformité",                         'type' => 'direction',  'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'DPSRC',    'libelle' => 'Direction de la Promotion Sécurité Routière et Communication',     'type' => 'direction',  'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'DDC',      'libelle' => 'Direction du Développement et de la Coopération',                  'type' => 'direction',  'niveau' => 1, 'parent' => 'ORG-SG'],
                ['code' => 'DAF',      'libelle' => 'Direction Administrative et Financière',                           'type' => 'direction',  'niveau' => 1, 'parent' => 'ORG-SG'],

                // --- Divisions : DEP ---
                ['code' => 'DEP-OSR',  'libelle' => 'Observatoire de la sécurité routière',                             'type' => 'division',   'niveau' => 2, 'parent' => 'DEP'],
                ['code' => 'DEP-EP',   'libelle' => 'Études et planification',                                          'type' => 'division',   'niveau' => 2, 'parent' => 'DEP'],

                // --- Divisions : DAC ---
                ['code' => 'DAC-DAHI', 'libelle' => 'Audit et Homologation des Infrastructures (DAHI)',                 'type' => 'division',   'niveau' => 2, 'parent' => 'DAC'],
                ['code' => 'DAC-CH',   'libelle' => 'Conformité et Homologations',                                      'type' => 'division',   'niveau' => 2, 'parent' => 'DAC'],

                // --- Divisions : DPSRC ---
                ['code' => 'DPSRC-CSE','libelle' => "Communication de la Sensibilisation et de l'événementiel",        'type' => 'division',   'niveau' => 2, 'parent' => 'DPSRC'],
                ['code' => 'DPSRC-EPR','libelle' => 'Éducation et Prévention routière',                                 'type' => 'division',   'niveau' => 2, 'parent' => 'DPSRC'],

                // --- Divisions : DDC ---
                ['code' => 'DDC-COOP', 'libelle' => 'Coopération',                                                     'type' => 'division',   'niveau' => 2, 'parent' => 'DDC'],
                ['code' => 'DDC-DT',   'libelle' => 'Déploiement territorial',                                          'type' => 'division',   'niveau' => 2, 'parent' => 'DDC'],

                // --- Divisions : DAF ---
                ['code' => 'DAF-FIN',  'libelle' => 'Finances',                                                         'type' => 'division',   'niveau' => 2, 'parent' => 'DAF'],
                ['code' => 'DAF-RH',   'libelle' => 'Ressources humaines',                                              'type' => 'division',   'niveau' => 2, 'parent' => 'DAF'],
            ];

            foreach ($entities as $index => $data) {
                $unit = OrganisationUnit::create([
                    'code'      => $data['code'],
                    'libelle'   => $data['libelle'],
                    'type'      => $data['type'],
                    'niveau'    => $data['niveau'],
                    'parent_id' => $data['parent'] ? $ids[$data['parent']] : null,
                    'ordre'     => $index,
                ]);
                $ids[$data['code']] = $unit->id;
            }

        $this->command?->info(count($entities) . ' entités organisationnelles créées.');
    }
}
