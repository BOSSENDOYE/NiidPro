<?php

namespace Database\Seeders;

use App\Models\TrainingType;
use Illuminate\Database\Seeder;

class TrainingSeeder extends Seeder
{
    public function run(): void
    {
        // ── Types de formation (données de configuration) ──
        $types = [
            ['name' => 'Bureautique',             'code' => 'BUR',  'description' => 'Formation à la suite bureautique (Word, Excel, PowerPoint)'],
            ['name' => 'Technique IT',            'code' => 'TIT',  'description' => 'Formations techniques en informatique'],
            ['name' => 'Gestion et Management',   'code' => 'MGT',  'description' => 'Formations en leadership et management'],
            ['name' => 'Conformité',              'code' => 'CON',  'description' => 'Formations obligatoires (hygiène, sécurité, RGPD)'],
            ['name' => 'Langues étrangères',      'code' => 'LANG', 'description' => 'Anglais, français, autres langues'],
            ['name' => 'Communication',           'code' => 'COM',  'description' => 'Communication interpersonnelle et relations publiques'],
            ['name' => 'Développement Personnel', 'code' => 'DEV',  'description' => 'Soft skills et développement professionnel'],
            ['name' => 'Métier',                  'code' => 'MET',  'description' => 'Formations spécifiques au métier'],
        ];

        foreach ($types as $type) {
            TrainingType::firstOrCreate(['code' => $type['code']], $type);
        }

        $this->command->info('Types de formation créés.');
    }
}
