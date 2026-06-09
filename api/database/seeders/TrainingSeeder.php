<?php

namespace Database\Seeders;

use App\Models\TrainingType;
use App\Models\TrainingProvider;
use App\Models\TrainingBudget;
use Illuminate\Database\Seeder;

class TrainingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ── Types de formation ──
        $types = [
            ['name' => 'Bureautique',           'code' => 'BUR', 'description' => 'Formation à la suite bureautique (Word, Excel, PowerPoint)'],
            ['name' => 'Technique IT',          'code' => 'TIT', 'description' => 'Formations techniques en informatique'],
            ['name' => 'Gestion et Management', 'code' => 'MGT', 'description' => 'Formations en leadership et management'],
            ['name' => 'Conformité',            'code' => 'CON', 'description' => 'Formations obligatoires (hygiène, sécurité, RGPD)'],
            ['name' => 'Langues étrangères',    'code' => 'LANG', 'description' => 'Anglais, français, autres langues'],
            ['name' => 'Communication',         'code' => 'COM', 'description' => 'Communication interpersonnelle et relations publiques'],
            ['name' => 'Développement Personnel', 'code' => 'DEV', 'description' => 'Soft skills et développement professionnel'],
            ['name' => 'Métier',                'code' => 'MET', 'description' => 'Formations spécifiques au métier'],
        ];

        foreach ($types as $type) {
            TrainingType::firstOrCreate(['code' => $type['code']], $type);
        }

        // ── Organismes de formation ──
        $providers = [
            [
                'name' => 'Université de Kinshasa',
                'contact_person' => 'Dr. Jean Mbala',
                'email' => 'formation@unikin.ac.cd',
                'phone' => '+243 81 234 5678',
                'address' => 'Avenue de la Gombe',
                'city' => 'Kinshasa',
                'country' => 'RDC',
            ],
            [
                'name' => 'IFAD - Institut de Formation Avancée',
                'contact_person' => 'Madame Sophie Durand',
                'email' => 'contact@ifad.org',
                'phone' => '+243 81 234 5679',
                'address' => 'Rue de la Paix',
                'city' => 'Kinshasa',
                'country' => 'RDC',
            ],
            [
                'name' => 'Microsoft Learning Partner',
                'contact_person' => 'Monsieur Pierre Dubois',
                'email' => 'training@microsoft-partner.com',
                'phone' => '+243 81 234 5680',
                'address' => 'Boulevard du Commerce',
                'city' => 'Kinshasa',
                'country' => 'RDC',
            ],
            [
                'name' => 'Centre de Formation Professionnelle',
                'contact_person' => 'Madame Marie Kalambayi',
                'email' => 'cfp@formation.cd',
                'phone' => '+243 81 234 5681',
                'address' => 'Avenue Foch',
                'city' => 'Kinshasa',
                'country' => 'RDC',
            ],
            [
                'name' => 'CEFORP - Centre de Formation RH',
                'contact_person' => 'Monsieur Robert Kazadi',
                'email' => 'info@ceforp.cd',
                'phone' => '+243 81 234 5682',
                'address' => 'Cité de la Gombe',
                'city' => 'Kinshasa',
                'country' => 'RDC',
            ],
        ];

        foreach ($providers as $provider) {
            TrainingProvider::firstOrCreate(['name' => $provider['name']], $provider);
        }

        // ── Budgets de formation ──
        // On récupère les departments pour créer des budgets par structure
        $departments = \App\Models\Department::all();
        $year = now()->year;
        
        foreach ($departments as $dept) {
            TrainingBudget::firstOrCreate(
                [
                    'department_id' => $dept->id,
                    'year' => $year,
                ],
                [
                    'name' => "Budget Formation {$dept->name} {$year}",
                    'amount' => 500000, // 500k FCFA par défaut
                    'consumed_amount' => 0,
                ]
            );
        }

        // Budget central pour formations inter-services
        TrainingBudget::firstOrCreate(
            [
                'department_id' => null,
                'year' => $year,
            ],
            [
                'name' => "Budget Formation Central {$year}",
                'amount' => 2000000, // 2M FCFA
                'consumed_amount' => 0,
            ]
        );

        $this->command->info('✅ Training types, providers, and budgets seeded successfully!');
    }
}
