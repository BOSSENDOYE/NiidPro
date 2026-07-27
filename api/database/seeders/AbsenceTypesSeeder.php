<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

class AbsenceTypesSeeder extends Seeder
{
    /**
     * Motifs d'absence autorisés — ANASER (Art. L.156 du Code du travail / CCNI)
     * Ces jours s'ajoutent au congé annuel et ne peuvent être imputés dessus.
     */
    public function run(): void
    {
        $types = [
            ['name' => 'Mariage du travailleur',                        'code' => 'ABS_MAR_TRV',  'max' => 3, 'color' => '#EC4899'],
            ['name' => "Mariage d'un enfant",                           'code' => 'ABS_MAR_ENF',  'max' => 1, 'color' => '#EC4899'],
            ['name' => "Naissance d'un enfant",                         'code' => 'ABS_NAIS',     'max' => 3, 'color' => '#10B981'],
            ['name' => 'Décès du conjoint',                             'code' => 'ABS_DEC_CONJ', 'max' => 3, 'color' => '#64748B'],
            ['name' => "Décès d'un enfant",                             'code' => 'ABS_DEC_ENF',  'max' => 3, 'color' => '#64748B'],
            ['name' => 'Décès du père ou de la mère',                   'code' => 'ABS_DEC_PAR',  'max' => 3, 'color' => '#64748B'],
            ['name' => "Décès d'un frère ou d'une sœur",                'code' => 'ABS_DEC_FRA',  'max' => 1, 'color' => '#64748B'],
            ['name' => 'Décès du beau-père ou de la belle-mère',        'code' => 'ABS_DEC_BPM',  'max' => 1, 'color' => '#64748B'],
            ['name' => 'Déménagement du foyer',                         'code' => 'ABS_DEM',      'max' => 1, 'color' => '#0EA5E9'],
            ['name' => "Hospitalisation du conjoint ou d'un enfant",    'code' => 'ABS_HOSP',     'max' => 1, 'color' => '#8B5CF6'],
        ];

        foreach ($types as $t) {
            LeaveType::firstOrCreate(
                ['code' => $t['code']],
                [
                    'name'                   => $t['name'],
                    'category'               => 'absence',
                    'color'                  => $t['color'],
                    'max_days_per_year'      => $t['max'],
                    'requires_justification' => true,
                    'paid'                   => true,
                    'is_active'              => true,
                ]
            );
        }

        $this->command->info('10 motifs d\'absence ANASER/CCNI insérés (ou déjà présents).');
    }
}
