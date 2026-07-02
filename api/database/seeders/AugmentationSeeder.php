<?php

namespace Database\Seeders;

use App\Models\RecruitmentAugmentation;
use Illuminate\Database\Seeder;

class AugmentationSeeder extends Seeder
{
    public function run(): void
    {
        $augmentations = [
            ['libelle' => 'Augmentation 04-94',              'type' => 'indiciaire'],
            ['libelle' => 'Augmentation 01-2000',             'type' => 'indiciaire'],
            ['libelle' => 'Augmentation 01-2002',             'type' => 'indiciaire'],
            ['libelle' => 'Augmentation 10-2004',             'type' => 'indiciaire'],
            ['libelle' => 'Augmentation 10-2005',             'type' => 'indiciaire'],
            ['libelle' => 'Augmentation solde 07-82 et 01/85','type' => 'indiciaire'],
            ['libelle' => 'Augmentation 07/83',               'type' => 'indiciaire'],
            ['libelle' => 'Indemnité risques santé',           'type' => 'indemnitaire'],
            ['libelle' => 'Indemnité de sujétion',             'type' => 'indemnitaire'],
            ['libelle' => 'Prime Transport',                   'type' => 'prime'],
        ];

        foreach ($augmentations as $data) {
            RecruitmentAugmentation::firstOrCreate(
                ['libelle' => $data['libelle']],
                [
                    'type'      => $data['type'],
                    'taux'      => null,
                    'unite'     => null,
                    'is_active' => true,
                ]
            );
        }
    }
}
