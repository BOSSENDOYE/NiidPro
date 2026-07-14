<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EvalCritereSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('eval_criteres')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $criteres = [
            // ── 7 critères de base — communs à TOUT le personnel (CDC §8.2 + Manuel p.67) ──
            ['code' => 'B01', 'libelle' => 'Assiduité au travail et conduite',                       'categorie' => 'base',           'ordre' => 1],
            ['code' => 'B02', 'libelle' => 'Ponctualité',                                             'categorie' => 'base',           'ordre' => 2],
            ['code' => 'B03', 'libelle' => 'Célérité dans l\'exécution des tâches',                   'categorie' => 'base',           'ordre' => 3],
            ['code' => 'B04', 'libelle' => 'Esprit d\'initiative',                                    'categorie' => 'base',           'ordre' => 4],
            ['code' => 'B05', 'libelle' => 'Sens des responsabilités',                                'categorie' => 'base',           'ordre' => 5],
            ['code' => 'B06', 'libelle' => 'Relations humaines',                                      'categorie' => 'base',           'ordre' => 6],
            ['code' => 'B07', 'libelle' => 'Engagement dans les projets, programmes et activités',   'categorie' => 'base',           'ordre' => 7],

            // ── 5 critères complémentaires — fiche modèle 2026 (tous agents selon validation ANASER) ──
            ['code' => 'C01', 'libelle' => 'Qualité du travail fourni',                               'categorie' => 'complementaire', 'ordre' => 8],
            ['code' => 'C02', 'libelle' => 'Respect des procédures internes',                         'categorie' => 'complementaire', 'ordre' => 9],
            ['code' => 'C03', 'libelle' => 'Capacité d\'organisation',                                'categorie' => 'complementaire', 'ordre' => 10],
            ['code' => 'C04', 'libelle' => 'Esprit d\'équipe',                                        'categorie' => 'complementaire', 'ordre' => 11],
            ['code' => 'C05', 'libelle' => 'Contribution à l\'atteinte des objectifs du service',    'categorie' => 'complementaire', 'ordre' => 12],

            // ── 6 critères spécifiques fonctionnaires mis à disposition (note de cadrage 2026) ──
            ['code' => 'F01', 'libelle' => 'Conscience professionnelle',                              'categorie' => 'fonctionnaire',  'ordre' => 13],
            ['code' => 'F02', 'libelle' => 'Bonne conduite',                                          'categorie' => 'fonctionnaire',  'ordre' => 14],
            ['code' => 'F03', 'libelle' => 'Respect du secret professionnel',                         'categorie' => 'fonctionnaire',  'ordre' => 15],
            ['code' => 'F04', 'libelle' => 'Tâches dévolues à l\'agent',                              'categorie' => 'fonctionnaire',  'ordre' => 16],
            ['code' => 'F05', 'libelle' => 'Sens de l\'engagement',                                   'categorie' => 'fonctionnaire',  'ordre' => 17],
            ['code' => 'F06', 'libelle' => 'Respect de l\'autorité et de la hiérarchie',              'categorie' => 'fonctionnaire',  'ordre' => 18],
        ];

        $now = now();
        foreach ($criteres as &$c) {
            $c['actif']      = true;
            $c['created_at'] = $now;
            $c['updated_at'] = $now;
        }

        DB::table('eval_criteres')->insert($criteres);
    }
}
