<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\EvaluationAnnuelle;
use App\Models\Avancement;
use App\Models\Promotion;
use App\Models\PlanDeveloppementIndividuel;
use App\Models\PdiAction;
use App\Models\MobiliteInterne;
use App\Models\Department;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;

class CarriereSeeder extends Seeder
{
    private int $adminId;

    public function run(): void
    {
        $this->adminId = User::where('email', 'admin@niidpro.com')->value('id')
            ?? User::first()->id;

        $this->assignerCategories();
        $this->seederEvaluations();
        $this->seederAvancements();
        $this->seederPromotions();
        $this->seederPDI();
        $this->seederMobilites();

        $this->command->info('✓ Données carrière insérées avec succès.');
    }

    // ── 1. Catégories & échelons ──────────────────────────────────────────────
    private function assignerCategories(): void
    {
        $mapping = [
            'P-DG'       => ['A1', 1, '2018-01-01'],
            'P-SG'       => ['A1', 2, '2021-01-01'],
            'P-DEP'      => ['A1', 1, '2020-06-01'],
            'P-DAC'      => ['A1', 1, '2020-06-01'],
            'P-DPSRC'    => ['A1', 1, '2020-06-01'],
            'P-DDC'      => ['A1', 1, '2020-06-01'],
            'P-DAF'      => ['A1', 1, '2020-06-01'],
            'P-CS'       => ['A1', 3, '2018-01-01'],
            'P-CONSTECH' => ['A2', 2, '2019-03-01'],
            'P-ODSR'     => ['A2', 2, '2020-01-01'],
            'P-EP'       => ['A2', 1, '2022-06-01'],
            'P-DAHI'     => ['A2', 2, '2020-06-01'],
            'P-CH'       => ['A2', 1, '2022-01-01'],
            'P-CSEV'     => ['A2', 1, '2022-01-01'],
            'P-EPR'      => ['A2', 2, '2020-06-01'],
            'P-COOP'     => ['B1', 3, '2018-01-01'],
            'P-DT'       => ['B1', 2, '2020-01-01'],
            'P-FIN'      => ['B1', 2, '2020-01-01'],
            'P-RH'       => ['B1', 3, '2018-01-01'],
            'P-ACC'      => ['B1', 2, '2021-01-01'],
            'P-CE'       => ['B2', 2, '2020-06-01'],
            'P-CC'       => ['B2', 1, '2022-06-01'],
            'P-AD'       => ['B2', 3, '2018-01-01'],
            'P-COORD'    => ['B2', 2, '2020-01-01'],
            'P-CHEF-BUR' => ['C',  3, '2018-01-01'],
            'P-SECR'     => ['C',  2, '2020-01-01'],
            'P-ECON'     => ['B2', 1, '2023-01-01'],
            'P-CH-POLE'  => ['B1', 2, '2020-06-01'],
            'P-AGT-TECH' => ['C',  2, '2021-01-01'],
            'P-AGT-ADM'  => ['C',  1, '2023-06-01'],
            'P-CHAUFFEUR'=> ['D',  3, '2018-01-01'],
            'P-COURSIER' => ['E',  2, '2020-01-01'],
            'P-MAGASIN'  => ['D',  1, '2022-01-01'],
            'P-RECEPT'   => ['D',  2, '2021-01-01'],
        ];

        $positions = Position::pluck('id', 'code');

        foreach ($mapping as $posCode => [$cat, $echelon, $dateEntree]) {
            if (! isset($positions[$posCode])) continue;
            Employee::where('position_id', $positions[$posCode])
                ->whereNull('categorie_emploi')
                ->update([
                    'categorie_emploi'    => $cat,
                    'echelon'             => $echelon,
                    'date_entree_echelon' => $dateEntree,
                ]);
        }

        Employee::where('status', 'active')
            ->whereNull('categorie_emploi')
            ->update(['categorie_emploi' => 'D', 'echelon' => 1, 'date_entree_echelon' => '2020-01-01']);

        $this->command->info('  ✓ Catégories & échelons assignés.');
    }

    // ── 2. Évaluations annuelles 2023 & 2024 ─────────────────────────────────
    private function seederEvaluations(): void
    {
        $agents = Employee::where('status', 'active')
            ->whereNotNull('categorie_emploi')
            ->whereNotNull('department_id')
            ->inRandomOrder()
            ->limit(20)
            ->get();

        $profils = [
            [3.8, 3.7, 3.9, 3.6],
            [3.5, 3.6, 3.4, 3.7],
            [3.2, 3.0, 3.1, 2.9],
            [2.8, 2.9, 3.0, 2.7],
            [2.6, 2.5, 2.7, 2.8],
            [2.3, 2.1, 2.4, 2.2],
            [1.9, 2.0, 1.8, 2.1],
            [1.4, 1.5, 1.3, 1.6],
            [3.9, 4.0, 3.8, 4.0],
            [3.1, 3.3, 2.9, 3.2],
            [2.4, 2.3, 2.5, 2.2],
            [3.7, 3.8, 3.6, 3.9],
            [2.9, 3.1, 2.8, 3.0],
            [1.7, 1.8, 1.6, 1.9],
            [3.4, 3.3, 3.5, 3.2],
            [2.0, 2.2, 1.9, 2.1],
            [3.6, 3.5, 3.7, 3.4],
            [2.7, 2.6, 2.8, 2.5],
            [1.2, 1.3, 1.1, 1.4],
            [3.3, 3.2, 3.4, 3.1],
        ];

        foreach ($agents as $i => $emp) {
            $notes = $profils[$i % count($profils)];

            // Évaluation 2024 (année N-1, validée)
            EvaluationAnnuelle::firstOrCreate(
                ['employee_id' => $emp->id, 'annee' => 2024],
                [
                    'evaluateur_id'         => $this->adminId,
                    'note_resultats'        => $notes[0],
                    'note_competences'      => $notes[1],
                    'note_comportement'     => $notes[2],
                    'note_developpement'    => $notes[3],
                    'commentaire_evaluateur'=> $this->commentaire($notes),
                    'objectifs_annee'       => 'Renforcer les compétences métier et améliorer la performance collective.',
                    'statut'                => 'validee',
                    'date_entretien'        => '2025-01-15',
                    'date_validation'       => '2025-01-22',
                ]
            );

            // Évaluation 2025 (année en cours, en cours de validation)
            $notes2025 = array_map(
                fn($n) => round(max(0, min(4, $n + (rand(-2, 2) * 0.1))), 1),
                $notes
            );

            EvaluationAnnuelle::firstOrCreate(
                ['employee_id' => $emp->id, 'annee' => 2025],
                [
                    'evaluateur_id'         => $this->adminId,
                    'note_resultats'        => $notes2025[0],
                    'note_competences'      => $notes2025[1],
                    'note_comportement'     => $notes2025[2],
                    'note_developpement'    => $notes2025[3],
                    'commentaire_evaluateur'=> $this->commentaire($notes2025),
                    'objectifs_annee'       => 'Atteindre les objectifs stratégiques fixés pour 2026.',
                    'statut'                => rand(0, 1) ? 'validee' : 'soumise',
                    'date_entretien'        => '2026-01-20',
                    'date_validation'       => rand(0, 1) ? '2026-01-27' : null,
                ]
            );
        }

        $this->command->info('  ✓ Évaluations annuelles 2023 & 2024 créées.');
    }

    // ── 3. Avancements ────────────────────────────────────────────────────────
    private function seederAvancements(): void
    {
        $agents = Employee::where('status', 'active')
            ->whereNotNull('categorie_emploi')
            ->inRandomOrder()
            ->limit(12)
            ->get();

        $statuts = [
            'accorde', 'accorde', 'accorde',
            'en_attente_daf', 'en_attente_dg',
            'refuse', 'accorde', 'reporte',
            'accorde', 'en_attente_daf', 'accorde', 'en_attente_dg',
        ];

        foreach ($agents as $i => $emp) {
            $statut      = $statuts[$i % count($statuts)];
            $dateElig    = date('Y-m-d', strtotime('-' . (14 - $i) . ' months'));
            $dateDecision= in_array($statut, ['accorde', 'refuse', 'reporte'])
                ? date('Y-m-d', strtotime('-' . max(1, 6 - $i) . ' months'))
                : null;

            Avancement::firstOrCreate(
                ['employee_id' => $emp->id, 'echelon_avant' => $emp->echelon],
                [
                    'categorie'          => $emp->categorie_emploi,
                    'echelon_avant'      => $emp->echelon,
                    'echelon_apres'      => $emp->echelon + 1,
                    'note_evaluation'    => round(min(4, 2.5 + $i * 0.1), 2),
                    'date_eligibilite'   => $dateElig,
                    'date_decision'      => $dateDecision,
                    'decision'           => match ($statut) {
                        'accorde'  => 'accorde',
                        'refuse'   => 'refuse',
                        'reporte'  => 'reporte',
                        default    => null,
                    },
                    'motif_refus'        => $statut === 'refuse' ? 'Note d\'évaluation inférieure au seuil requis.' : null,
                    'initie_par_id'      => $this->adminId,
                    'valide_par_daf_id'  => in_array($statut, ['en_attente_dg', 'accorde', 'reporte', 'refuse']) ? $this->adminId : null,
                    'decide_par_dg_id'   => in_array($statut, ['accorde', 'refuse', 'reporte']) ? $this->adminId : null,
                    'notifie_le'         => $statut === 'accorde' ? $dateDecision : null,
                    'statut'             => $statut,
                ]
            );
        }

        $this->command->info('  ✓ Avancements créés.');
    }

    // ── 4. Promotions ─────────────────────────────────────────────────────────
    private function seederPromotions(): void
    {
        $promotibles = Employee::where('status', 'active')
            ->whereIn('categorie_emploi', ['C', 'B1', 'B2'])
            ->inRandomOrder()
            ->limit(6)
            ->get();

        $statuts = ['appel_candidature', 'commission_tenue', 'accorde', 'accorde', 'en_instruction', 'refuse'];
        $types   = ['au_choix', 'formation_qualifiante', 'au_choix', 'concours_interne', 'au_choix', 'formation_qualifiante'];
        $nextCat = ['C' => 'B2', 'B2' => 'B1', 'B1' => 'A2'];

        foreach ($promotibles as $i => $emp) {
            $catApres  = $nextCat[$emp->categorie_emploi] ?? 'B2';
            $statut    = $statuts[$i % count($statuts)];
            $type      = $types[$i % count($types)];
            $dateEffet = $statut === 'accorde'
                ? date('Y-m-d', strtotime('first day of next month -' . ($i + 1) . ' months'))
                : null;

            Promotion::firstOrCreate(
                ['employee_id' => $emp->id],
                [
                    'categorie_avant'       => $emp->categorie_emploi,
                    'categorie_apres'       => $catApres,
                    'type_promotion'        => $type,
                    'annees_dans_categorie' => 5 + $i,
                    'note_eval_n1'          => round(3.0 + $i * 0.1, 1),
                    'note_eval_n2'          => round(2.9 + $i * 0.1, 1),
                    'commission_date'       => in_array($statut, ['commission_tenue', 'accorde', 'refuse']) ? '2024-11-15' : null,
                    'commission_avis'       => $statut === 'accorde' ? 'favorable' : ($statut === 'refuse' ? 'defavorable' : null),
                    'decide_par_dg_id'      => in_array($statut, ['accorde', 'refuse']) ? $this->adminId : null,
                    'date_decision'         => in_array($statut, ['accorde', 'refuse']) ? date('Y-m-d', strtotime('-' . ($i + 1) . ' months')) : null,
                    'date_effet'            => $dateEffet,
                    'commentaire'           => $statut === 'accorde'
                        ? 'Promotion accordée en reconnaissance des résultats et de l\'ancienneté.'
                        : ($statut === 'refuse' ? 'Conditions de promotion non réunies cette année.' : null),
                    'statut'                => $statut,
                ]
            );
        }

        $this->command->info('  ✓ Promotions créées.');
    }

    // ── 5. PDI avec actions ───────────────────────────────────────────────────
    private function seederPDI(): void
    {
        $evals = EvaluationAnnuelle::where('note_globale', '<', 3.0)
            ->whereIn('annee', [2024, 2025])
            ->with('employee')
            ->limit(8)
            ->get();

        $actionsParPdi = [
            [
                ['formation', 'Formation en gestion de projet', 'CESAG',          3,  '2025-06-30', 'planifie'],
                ['formation', 'Communication professionnelle',  null,              2,  '2025-09-30', 'en_cours'],
            ],
            [
                ['formation', 'Excel avancé & tableaux de bord','CFTC',           2,  '2025-04-30', 'realise'],
                ['mission',   'Mission d\'observation DEP',     null,              5,  '2025-07-31', 'planifie'],
            ],
            [
                ['formation',          'Leadership & management d\'équipe', 'ENA',  4, '2025-05-15', 'en_cours'],
                ['projet_transverse',  'Participation au projet SIG routier', null, 10, '2025-12-31', 'planifie'],
                ['formation',          'Gestion du temps et des priorités', null,   1, '2025-03-31', 'realise'],
            ],
            [
                ['formation', 'Réglementation sécurité routière', 'ANASER', 2, '2025-06-30', 'planifie'],
            ],
            [
                ['formation', 'Rédaction administrative',   'ENA',  3, '2025-08-31', 'planifie'],
                ['mission',   'Stage d\'immersion DAF',     null,   5, '2025-07-15', 'planifie'],
            ],
            [
                ['formation', 'Comptabilité publique niv. 2', 'ENAEM', 5, '2025-10-31', 'planifie'],
            ],
            [
                ['projet_transverse', 'Comité digitalisation RH', null,     8, '2025-09-30', 'en_cours'],
                ['formation',         'Conduite du changement',  'CESAG',    2, '2025-11-30', 'planifie'],
            ],
            [
                ['formation', 'Anglais professionnel',      'British Council', 20, '2025-12-31', 'en_cours'],
                ['formation', 'Prise de parole en public',  null,              1,  '2025-05-31', 'realise'],
            ],
        ];

        foreach ($evals as $i => $eval) {
            if (! $eval->employee) continue;

            $pdi = PlanDeveloppementIndividuel::firstOrCreate(
                ['employee_id' => $eval->employee_id, 'annee' => $eval->annee],
                [
                    'evaluation_annuelle_id'  => $eval->id,
                    'objectifs_professionnels'=> 'Améliorer les performances et acquérir les compétences nécessaires au développement professionnel.',
                    'competences_a_renforcer' => 'Rigueur opérationnelle, communication, maîtrise des outils numériques.',
                    'statut'                  => ['brouillon', 'soumis', 'valide', 'valide'][$i % 4],
                    'valide_par_rh_id'        => $i > 1 ? $this->adminId : null,
                    'date_validation'         => $i > 1 ? date('Y-m-d', strtotime('-' . (6 - $i) . ' months')) : null,
                ]
            );

            $actionsSet = $actionsParPdi[$i % count($actionsParPdi)];
            foreach ($actionsSet as [$type, $intitule, $organisme, $duree, $echeance, $statut]) {
                PdiAction::firstOrCreate(
                    ['pdi_id' => $pdi->id, 'intitule' => $intitule],
                    [
                        'type'             => $type,
                        'organisme'        => $organisme,
                        'duree_jours'      => $duree,
                        'echeance'         => $echeance,
                        'indicateur_suivi' => 'Attestation de participation ou rapport de mission.',
                        'statut'           => $statut,
                    ]
                );
            }
        }

        $this->command->info('  ✓ PDI et actions créés.');
    }

    // ── 6. Mobilités internes ─────────────────────────────────────────────────
    private function seederMobilites(): void
    {
        $depts = Department::pluck('id', 'code');

        $agents = Employee::where('status', 'active')
            ->whereNotNull('department_id')
            ->inRandomOrder()
            ->limit(8)
            ->get();

        $types       = ['fonctionnelle', 'geographique', 'fonctionnelle', 'organisationnelle', 'fonctionnelle', 'geographique', 'fonctionnelle', 'organisationnelle'];
        $statuts     = ['approuvee', 'approuvee', 'en_etude', 'soumise_sg', 'approuvee', 'refusee', 'en_etude', 'soumise_sg'];
        $initiateurs = ['agent', 'hierarchie', 'agent', 'direction', 'agent', 'hierarchie', 'agent', 'direction'];

        $deptPairs = [
            ['DAF',      'DEP'],
            ['POLE-DKR', 'POLE-NORD'],
            ['DEP',      'DAC'],
            ['DPSRC',    'DDC'],
            ['POLE-CTR', 'POLE-SUD'],
            ['SG',       'DAF'],
            ['DAC',      'DEP'],
            ['POLE-THIS','POLE-DIOU'],
        ];

        foreach ($agents as $i => $emp) {
            [$avantCode, $apresCode] = $deptPairs[$i % count($deptPairs)];

            if (! isset($depts[$avantCode]) || ! isset($depts[$apresCode])) continue;

            $statut      = $statuts[$i % count($statuts)];
            $dateDemande = date('Y-m-d', strtotime('-' . (8 - $i) . ' months'));
            $datePreavis = date('Y-m-d', strtotime($dateDemande . ' +30 days'));
            $dateEffet   = $statut === 'approuvee'
                ? date('Y-m-d', strtotime($dateDemande . ' +35 days'))
                : null;

            MobiliteInterne::firstOrCreate(
                ['employee_id' => $emp->id, 'department_avant_id' => $depts[$avantCode]],
                [
                    'type_mobilite'      => $types[$i % count($types)],
                    'initiateur'         => $initiateurs[$i % count($initiateurs)],
                    'department_apres_id'=> $depts[$apresCode],
                    'position_avant_id'  => $emp->position_id,
                    'position_apres_id'  => $emp->position_id,
                    'motif'              => 'Optimisation des ressources humaines et renforcement des capacités du service d\'accueil.',
                    'date_demande'       => $dateDemande,
                    'date_preavis_30j'   => $datePreavis,
                    'date_prise_effet'   => $dateEffet,
                    'valide_par_sg_id'   => in_array($statut, ['soumise_sg', 'approuvee', 'refusee']) ? $this->adminId : null,
                    'decide_par_dg_id'   => in_array($statut, ['approuvee', 'refusee']) ? $this->adminId : null,
                    'date_decision'      => in_array($statut, ['approuvee', 'refusee']) ? $dateEffet : null,
                    'delegues_informes'  => $statut === 'approuvee',
                    'commentaire_rh'     => $statut === 'approuvee'
                        ? 'Mobilité approuvée. Agent informé de la prise d\'effet.'
                        : ($statut === 'refusee' ? 'Non retenu pour raisons organisationnelles.' : null),
                    'statut'             => $statut,
                ]
            );
        }

        $this->command->info('  ✓ Mobilités internes créées.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    private function commentaire(array $notes): string
    {
        $avg = array_sum($notes) / count($notes);
        if ($avg >= 3.5) return 'Agent très performant. Résultats excellents sur tous les axes d\'évaluation. À valoriser.';
        if ($avg >= 2.5) return 'Performance globalement satisfaisante. Quelques axes d\'amélioration identifiés.';
        if ($avg >= 1.5) return 'Performance passable. Un PDI est recommandé pour renforcer les points faibles.';
        return 'Performance insuffisante. Un PDI obligatoire est mis en place. Suivi rapproché requis.';
    }
}
