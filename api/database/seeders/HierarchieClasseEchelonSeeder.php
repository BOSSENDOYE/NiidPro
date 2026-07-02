<?php

namespace Database\Seeders;

use App\Models\PaieClasse;
use App\Models\PaieEchelon;
use App\Models\RecruitmentHierarchy;
use Illuminate\Database\Seeder;

class HierarchieClasseEchelonSeeder extends Seeder
{
    public function run(): void
    {
        // ── Hiérarchies ─────────────────────────────────────────────────────────
        // [code, libelle, ordre]
        $hierarchies = [
            ['A ESP', 'Catégorie A Spéciale',    1],
            ['A1',    'Catégorie A1',             2],
            ['A2',    'Catégorie A2',             3],
            ['A3',    'Catégorie A3',             4],
            ['B1',    'Catégorie B1',             5],
            ['B2',    'Catégorie B2',             6],
            ['B3',    'Catégorie B3',             7],
            ['B4',    'Catégorie B4',             8],
            ['C1',    'Catégorie C1',             9],
            ['C2',    'Catégorie C2',            10],
            ['C3',    'Catégorie C3',            11],
            ['D1',    'Catégorie D1',            12],
            ['D2',    'Catégorie D2',            13],
            ['D3',    'Catégorie D3',            14],
        ];

        // ── Classes & Échelons ──────────────────────────────────────────────────
        // Pattern standard (D*, C*, B3, B4) :
        //   2ème Classe       : échelons 1→4
        //   1ère Classe       : échelons 1→3
        //   Principal         : échelons 1→3
        //   Classe Except.    : échelon  1
        //
        // Pattern étendu (A*, B1, B2) :
        //   2ème Classe       : échelons 1→2
        //   1ère Classe       : échelons 1→2
        //   Principal 2CL     : échelons 1→2
        //   Principal 1CL     : échelons 1→2
        //   Classe Except.    : échelon  1

        // [code, libelle, [numéros d'échelons]]
        $stdClasses = [
            ['2CL',  '2ème Classe',                        [1, 2, 3, 4]],
            ['1CL',  '1ère Classe',                        [1, 2, 3]],
            ['P',    'Principal',                          [1, 2, 3]],
            ['PCE',  'Principal de Classe Exceptionnelle', [1]],
        ];

        $extClasses = [
            ['2CL',  '2ème Classe',                        [1, 2]],
            ['1CL',  '1ère Classe',                        [1, 2]],
            ['P2CL', 'Principal 2ème Classe',              [1, 2]],
            ['P1CL', 'Principal 1ère Classe',              [1, 2]],
            ['PCE',  'Principal de Classe Exceptionnelle', [1]],
        ];

        $stdHierarchyCodes = ['D3', 'D2', 'D1', 'C1', 'C2', 'C3', 'B4', 'B3'];
        $extHierarchyCodes = ['B2', 'B1', 'A3', 'A2', 'A1', 'A ESP'];

        foreach ($hierarchies as [$code, $libelle, $ordre]) {
            $hierarchy = RecruitmentHierarchy::updateOrCreate(
                ['code' => $code],
                ['libelle' => $libelle, 'ordre' => $ordre, 'is_active' => true]
            );

            $classes = in_array($code, $stdHierarchyCodes) ? $stdClasses : $extClasses;

            foreach ($classes as [$classCode, $classLibelle, $echelonNums]) {
                $classe = PaieClasse::updateOrCreate(
                    ['hierarchy_id' => $hierarchy->id, 'code' => $classCode],
                    ['libelle' => $classLibelle, 'is_active' => true]
                );

                foreach ($echelonNums as $num) {
                    $echelonLibelle = match ($num) {
                        1       => $classCode === 'PCE' ? 'Classe Exceptionnelle' : '1er Échelon',
                        2       => '2ème Échelon',
                        3       => '3ème Échelon',
                        4       => '4ème Échelon',
                        default => $num . 'ème Échelon',
                    };

                    PaieEchelon::updateOrCreate(
                        ['class_id' => $classe->id, 'numero' => $num],
                        ['libelle' => $echelonLibelle, 'is_active' => true]
                    );
                }
            }
        }

        $this->command->info('Hiérarchies, classes et échelons insérés avec succès.');
    }
}
