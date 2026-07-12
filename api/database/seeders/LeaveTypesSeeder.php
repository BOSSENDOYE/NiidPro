<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LeaveTypesSeeder extends Seeder
{
    public function run(): void
    {
        // Supprimer les types existants (sans toucher aux congés liés)
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('leave_types')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $now = now();

        $types = [
            // ── Congés ────────────────────────────────────────────────────────────
            ['category' => 'Congés', 'name' => 'Congé annuel',                              'code' => 'CA',          'color' => '#10B981', 'paid' => true,  'requires_justification' => false, 'max_days_per_year' => 24, 'is_active' => true],
            ['category' => 'Congés', 'name' => 'Congé de maladie',                          'code' => 'CM',          'color' => '#F59E0B', 'paid' => true,  'requires_justification' => true,  'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Congés', 'name' => 'Congé de maternité',                        'code' => 'CMAT',        'color' => '#EC4899', 'paid' => true,  'requires_justification' => true,  'max_days_per_year' => 98,  'is_active' => true],
            ['category' => 'Congés', 'name' => 'Congé de paternité',                        'code' => 'CPAT',        'color' => '#6366F1', 'paid' => true,  'requires_justification' => true,  'max_days_per_year' => 3,   'is_active' => true],
            ['category' => 'Congés', 'name' => "Congé d'adoption",                          'code' => 'CADOP',       'color' => '#8B5CF6', 'paid' => true,  'requires_justification' => true,  'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Congés', 'name' => 'Congé sans solde',                          'code' => 'CSS',         'color' => '#94A3B8', 'paid' => false, 'requires_justification' => false, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Congés', 'name' => 'Congé de convenance personnelle',           'code' => 'CCP',         'color' => '#64748B', 'paid' => false, 'requires_justification' => false, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Congés', 'name' => 'Congé exceptionnel',                        'code' => 'CE',          'color' => '#0EA5E9', 'paid' => true,  'requires_justification' => false, 'max_days_per_year' => null, 'is_active' => true],

            // ── Autorisations spéciales ───────────────────────────────────────────
            ['category' => 'Autorisations spéciales', 'name' => 'Décès du conjoint',                                     'code' => 'DEC_CONJ',    'color' => '#1E293B', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 5,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Décès d'un enfant",                                     'code' => 'DEC_ENF',     'color' => '#1E293B', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 5,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => 'Décès du père ou de la mère',                           'code' => 'DEC_PARENT',  'color' => '#334155', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 3,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Décès d'un frère ou d'une sœur",                        'code' => 'DEC_FRATRIE', 'color' => '#334155', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 3,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Décès d'un beau-parent",                                'code' => 'DEC_BPARENT', 'color' => '#475569', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 3,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Décès d'un grand-parent",                               'code' => 'DEC_GP',      'color' => '#475569', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 2,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Mariage de l'agent",                                    'code' => 'MAR_AGENT',   'color' => '#F97316', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 5,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Mariage d'un enfant",                                   'code' => 'MAR_ENF',     'color' => '#FB923C', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 2,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Naissance d'un enfant",                                 'code' => 'NAISS',       'color' => '#22C55E', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 3,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Baptême d'un enfant",                                   'code' => 'BAPTEME',     'color' => '#86EFAC', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 1,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Circoncision d'un enfant",                              'code' => 'CIRCON',      'color' => '#6EE7B7', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 1,  'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => 'Convocation devant une autorité administrative ou judiciaire', 'code' => 'CONV_AJ',  'color' => '#FBBF24', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => "Participation à un examen ou à un concours",            'code' => 'EXAMEN',      'color' => '#3B82F6', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Autorisations spéciales', 'name' => 'Déménagement',                                          'code' => 'DEMENAG',     'color' => '#A78BFA', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => 1,  'is_active' => true],

            // ── Service ───────────────────────────────────────────────────────────
            ['category' => 'Service', 'name' => 'Mission',               'code' => 'MISSION',     'color' => '#0284C7', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Service', 'name' => 'Formation',             'code' => 'FORMATION',   'color' => '#0891B2', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Service', 'name' => 'Séminaire',             'code' => 'SEMINAIRE',   'color' => '#0D9488', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Service', 'name' => 'Atelier',               'code' => 'ATELIER',     'color' => '#059669', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Service', 'name' => 'Réunion officielle',    'code' => 'REUNION',     'color' => '#7C3AED', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Service', 'name' => 'Déplacement de service','code' => 'DEPLACEMENT', 'color' => '#1D4ED8', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],

            // ── Représentation ────────────────────────────────────────────────────
            ['category' => 'Représentation', 'name' => 'Activité syndicale autorisée',                                    'code' => 'SYNDICAL', 'color' => '#B45309', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Représentation', 'name' => "Exercice d'un mandat électif ou de représentation",              'code' => 'MANDAT',   'color' => '#92400E', 'paid' => true, 'requires_justification' => true, 'max_days_per_year' => null, 'is_active' => true],

            // ── Autres ────────────────────────────────────────────────────────────
            ['category' => 'Autres', 'name' => "Autorisation d'absence pour raisons personnelles", 'code' => 'AUT_PERSO',  'color' => '#6B7280', 'paid' => false, 'requires_justification' => false, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Autres', 'name' => 'Retard autorisé',                                   'code' => 'RETARD',     'color' => '#9CA3AF', 'paid' => false, 'requires_justification' => false, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Autres', 'name' => 'Absence justifiée',                                 'code' => 'ABS_JUST',   'color' => '#D97706', 'paid' => false, 'requires_justification' => true,  'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Autres', 'name' => 'Absence injustifiée',                               'code' => 'ABS_INJUST', 'color' => '#EF4444', 'paid' => false, 'requires_justification' => false, 'max_days_per_year' => null, 'is_active' => true],
            ['category' => 'Autres', 'name' => 'Mise à pied conservatoire',                         'code' => 'MISE_PIED',  'color' => '#DC2626', 'paid' => false, 'requires_justification' => true,  'max_days_per_year' => null, 'is_active' => true],
        ];

        $rows = array_map(fn($t) => array_merge($t, ['created_at' => $now, 'updated_at' => $now]), $types);
        DB::table('leave_types')->insert($rows);

        $this->command->info('✓ ' . count($rows) . ' types de congé insérés.');
    }
}
