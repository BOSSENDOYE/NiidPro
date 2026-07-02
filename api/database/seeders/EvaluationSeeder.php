<?php

namespace Database\Seeders;

use App\Models\EvaluationCritere;
use App\Models\EvaluationHistorique;
use App\Models\EvaluationNote;
use App\Models\EvaluationPeriodeEssai;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class EvaluationSeeder extends Seeder
{
    public function run(): void
    {
        // Nettoyage (FK désactivées le temps du truncate)
        Schema::disableForeignKeyConstraints();
        EvaluationHistorique::truncate();
        EvaluationNote::truncate();
        EvaluationPeriodeEssai::truncate();
        EvaluationCritere::truncate();
        Schema::enableForeignKeyConstraints();

        // ── Critères ANASER-RH-GE-2025-002 ──────────────────────────────────
        // Poids global = poids_section × poids_groupe
        // Section A (40%) : 35%×0.40, 25%×0.40, 20%×0.40, 20%×0.40
        // Section B (30%) : 30%×0.30, 25%×0.30, 25%×0.30, 20%×0.30
        // Section C (30%) : 30%×0.30, 25%×0.30, 25%×0.30, 20%×0.30
        $criteres = [
            // A — COMPÉTENCES TECHNIQUES ET PROFESSIONNELLES (40%)
            ['code' => 'A001', 'libelle' => "Maîtrise des tâches et missions du poste",              'groupe' => 'competences_techniques',  'poids' => 0.1400, 'ordre' => 1],
            ['code' => 'A002', 'libelle' => "Qualité et précision du travail rendu",                 'groupe' => 'competences_techniques',  'poids' => 0.1000, 'ordre' => 2],
            ['code' => 'A003', 'libelle' => "Respect des procédures et règles internes",             'groupe' => 'competences_techniques',  'poids' => 0.0800, 'ordre' => 3],
            ['code' => 'A004', 'libelle' => "Connaissance de l'environnement institutionnel ANASER", 'groupe' => 'competences_techniques',  'poids' => 0.0800, 'ordre' => 4],
            // B — COMPORTEMENT ET RELATIONS PROFESSIONNELLES (30%)
            ['code' => 'B001', 'libelle' => "Ponctualité et assiduité",                             'groupe' => 'comportement_relations',  'poids' => 0.0900, 'ordre' => 5],
            ['code' => 'B002', 'libelle' => "Respect de la hiérarchie et des collègues",            'groupe' => 'comportement_relations',  'poids' => 0.0750, 'ordre' => 6],
            ['code' => 'B003', 'libelle' => "Esprit d'équipe et collaboration",                     'groupe' => 'comportement_relations',  'poids' => 0.0750, 'ordre' => 7],
            ['code' => 'B004', 'libelle' => "Présentation et tenue professionnelle",                'groupe' => 'comportement_relations',  'poids' => 0.0600, 'ordre' => 8],
            // C — APTITUDES PERSONNELLES (30%)
            ['code' => 'C001', 'libelle' => "Initiative et autonomie dans le travail",              'groupe' => 'aptitudes_personnelles',  'poids' => 0.0900, 'ordre' => 9],
            ['code' => 'C002', 'libelle' => "Capacité d'adaptation aux changements",               'groupe' => 'aptitudes_personnelles',  'poids' => 0.0750, 'ordre' => 10],
            ['code' => 'C003', 'libelle' => "Réactivité et respect des délais",                    'groupe' => 'aptitudes_personnelles',  'poids' => 0.0750, 'ordre' => 11],
            ['code' => 'C004', 'libelle' => "Sens des responsabilités",                             'groupe' => 'aptitudes_personnelles',  'poids' => 0.0600, 'ordre' => 12],
        ];
        // Total poids = 0.14+0.10+0.08+0.08 + 0.09+0.075+0.075+0.06 + 0.09+0.075+0.075+0.06 = 1.00

        foreach ($criteres as $c) {
            EvaluationCritere::create($c);
        }

        $cIds = EvaluationCritere::orderBy('ordre')->pluck('id', 'code');

        // ── 8 évaluations tests ──────────────────────────────────────────────
        $evaluations = [
            // 1 — Brouillon
            [
                'employee_id'      => 1,
                'responsable_id'   => 2,
                'type'             => '3_mois',
                'categorie'        => 'B2',
                'date_prise_poste' => '2026-04-01',
                'date_fin_periode' => '2026-07-01',
                'date_entretien'   => '2026-06-25',
                'statut'           => 'brouillon',
                'statut_dossier'   => 'en_cours',
            ],
            // 2 — Auto-évaluation
            [
                'employee_id'       => 2,
                'responsable_id'    => 2,
                'type'              => '6_mois',
                'categorie'         => 'A2',
                'date_prise_poste'  => '2025-12-15',
                'date_fin_periode'  => '2026-06-15',
                'date_envoi_fiche'  => '2026-06-10',
                'date_entretien'    => '2026-06-28',
                'statut'            => 'auto_evaluation',
                'statut_dossier'    => 'en_cours',
            ],
            // 3 — Entretien
            [
                'employee_id'       => 3,
                'responsable_id'    => 3,
                'type'              => '3_mois',
                'categorie'         => 'C',
                'date_prise_poste'  => '2026-03-15',
                'date_fin_periode'  => '2026-06-15',
                'date_envoi_fiche'  => '2026-06-08',
                'date_entretien'    => '2026-06-18',
                'statut'            => 'entretien',
                'statut_dossier'    => 'en_cours',
            ],
            // 4 — Signé — passable (note ~2.18)
            [
                'employee_id'             => 4,
                'responsable_id'          => 3,
                'type'                    => '3_mois',
                'categorie'               => 'D',
                'date_prise_poste'        => '2026-02-01',
                'date_fin_periode'        => '2026-05-01',
                'date_envoi_fiche'        => '2026-04-24',
                'date_entretien'          => '2026-04-29',
                'statut'                  => 'signe',
                'statut_dossier'          => 'en_attente',
                'signe_agent_at'          => '2026-04-29 14:00:00',
                'signe_hierarchique_at'   => '2026-04-29 14:00:00',
                'note_globale'            => 2.14,
                'appreciation'            => 'passable',
                'decision_recommandee'    => 'renouvellement',
                'commentaire_general'     => "L'agent montre de la bonne volonté mais doit renforcer ses acquis techniques.",
                'plan_amelioration'       => "Accompagnement par le chef de division pendant 2 mois supplémentaires.",
            ],
            // 5 — Validé RRH — satisfaisant (~2.79)
            [
                'employee_id'             => 5,
                'responsable_id'          => 2,
                'type'                    => '6_mois',
                'categorie'               => 'B1',
                'date_prise_poste'        => '2025-11-01',
                'date_fin_periode'        => '2026-05-01',
                'date_envoi_fiche'        => '2026-04-22',
                'date_entretien'          => '2026-04-28',
                'statut'                  => 'valide_rrh',
                'statut_dossier'          => 'en_attente',
                'signe_agent_at'          => '2026-04-28 10:30:00',
                'signe_hierarchique_at'   => '2026-04-28 10:30:00',
                'valide_rrh_at'           => '2026-04-30 09:00:00',
                'valide_rrh_user_id'      => 2,
                'note_globale'            => 2.83,
                'appreciation'            => 'satisfaisant',
                'decision_recommandee'    => 'confirmation',
                'commentaire_general'     => "Agent sérieux, bien intégré dans l'équipe. Bonne maîtrise des outils et processus internes.",
            ],
            // 6 — Décision DG — excellent
            [
                'employee_id'             => 6,
                'responsable_id'          => 3,
                'type'                    => '3_mois',
                'categorie'               => 'A1',
                'date_prise_poste'        => '2026-01-06',
                'date_fin_periode'        => '2026-04-06',
                'date_envoi_fiche'        => '2026-03-30',
                'date_entretien'          => '2026-04-02',
                'statut'                  => 'decision_dg',
                'statut_dossier'          => 'confirme',
                'signe_agent_at'          => '2026-04-02 11:00:00',
                'signe_hierarchique_at'   => '2026-04-02 11:00:00',
                'valide_rrh_at'           => '2026-04-04 09:00:00',
                'valide_rrh_user_id'      => 2,
                'decision_dg_at'          => '2026-04-06 15:00:00',
                'decision_dg_user_id'     => 1,
                'decision_finale'         => 'confirmation',
                'note_globale'            => 3.56,
                'appreciation'            => 'excellent',
                'decision_recommandee'    => 'confirmation',
                'commentaire_general'     => "Agent remarquable, s'est démarqué dès ses premières semaines par sa rigueur et sa proactivité.",
                'remarques_dg'            => "Confirmation accordée avec mention. Intégration à l'équipe stratégique DEP recommandée.",
            ],
            // 7 — Archivé — confirmation
            [
                'employee_id'             => 7,
                'responsable_id'          => 2,
                'type'                    => '6_mois',
                'categorie'               => 'B2',
                'date_prise_poste'        => '2025-09-01',
                'date_fin_periode'        => '2026-03-01',
                'date_envoi_fiche'        => '2026-02-20',
                'date_entretien'          => '2026-02-25',
                'statut'                  => 'archive',
                'statut_dossier'          => 'confirme',
                'signe_agent_at'          => '2026-02-25 10:00:00',
                'signe_hierarchique_at'   => '2026-02-25 10:00:00',
                'valide_rrh_at'           => '2026-02-27 09:00:00',
                'valide_rrh_user_id'      => 2,
                'decision_dg_at'          => '2026-03-01 14:00:00',
                'decision_dg_user_id'     => 1,
                'decision_finale'         => 'confirmation',
                'note_globale'            => 3.08,
                'appreciation'            => 'satisfaisant',
                'decision_recommandee'    => 'confirmation',
                'commentaire_general'     => "Bon profil, a rapidement pris en main les dossiers en cours.",
                'remarques_dg'            => "Confirmation accordée.",
            ],
            // 8 — Archivé — non-confirmation
            [
                'employee_id'             => 8,
                'responsable_id'          => 3,
                'type'                    => '3_mois',
                'categorie'               => 'E',
                'date_prise_poste'        => '2026-02-03',
                'date_fin_periode'        => '2026-05-03',
                'date_envoi_fiche'        => '2026-04-25',
                'date_entretien'          => '2026-04-30',
                'statut'                  => 'archive',
                'statut_dossier'          => 'non_confirme',
                'signe_agent_at'          => '2026-04-30 15:00:00',
                'signe_hierarchique_at'   => '2026-04-30 15:00:00',
                'valide_rrh_at'           => '2026-05-02 09:00:00',
                'valide_rrh_user_id'      => 2,
                'decision_dg_at'          => '2026-05-03 11:00:00',
                'decision_dg_user_id'     => 1,
                'decision_finale'         => 'non_confirmation',
                'note_globale'            => 1.33,
                'appreciation'            => 'insuffisant',
                'decision_recommandee'    => 'non_confirmation',
                'commentaire_general'     => "Difficultés persistantes malgré l'accompagnement mis en place. Absentéisme récurrent non justifié.",
                'plan_amelioration'       => "Un accompagnement supplémentaire avait été proposé sans résultat.",
                'remarques_dg'            => "Non-confirmation décidée conformément à l'avis du responsable hiérarchique et de la RRH.",
            ],
        ];

        foreach ($evaluations as $ev) {
            EvaluationPeriodeEssai::create($ev);
        }

        // ── Notes pour évaluations ≥ signe ───────────────────────────────────
        // Éval 4 — passable : notes 2
        $this->insererNotes(4, $cIds, [
            'A001' => 2, 'A002' => 2, 'A003' => 2, 'A004' => 2,
            'B001' => 2, 'B002' => 3, 'B003' => 3, 'B004' => 2,
            'C001' => 2, 'C002' => 2, 'C003' => 2, 'C004' => 2,
        ], [
            'A001' => "Encore en apprentissage des procédures internes.",
            'B002' => "Bonnes relations avec les collègues.",
        ]);

        // Éval 5 — satisfaisant : notes 3
        $this->insererNotes(5, $cIds, [
            'A001' => 3, 'A002' => 3, 'A003' => 3, 'A004' => 3,
            'B001' => 3, 'B002' => 3, 'B003' => 3, 'B004' => 3,
            'C001' => 2, 'C002' => 3, 'C003' => 3, 'C004' => 3,
        ]);

        // Éval 6 — excellent : notes 4
        $this->insererNotes(6, $cIds, [
            'A001' => 4, 'A002' => 4, 'A003' => 4, 'A004' => 3,
            'B001' => 4, 'B002' => 4, 'B003' => 4, 'B004' => 3,
            'C001' => 3, 'C002' => 4, 'C003' => 4, 'C004' => 4,
        ], [
            'A001' => "Excellente maîtrise des outils analytiques et réglementaires.",
            'B001' => "Toujours ponctuel, disponible au-delà des heures normales lors des pics.",
            'C001' => "A proposé 3 améliorations de processus dès le 2e mois.",
        ]);

        // Éval 7 — satisfaisant : notes 3
        $this->insererNotes(7, $cIds, [
            'A001' => 3, 'A002' => 3, 'A003' => 3, 'A004' => 4,
            'B001' => 3, 'B002' => 3, 'B003' => 4, 'B004' => 3,
            'C001' => 3, 'C002' => 3, 'C003' => 3, 'C004' => 3,
        ]);

        // Éval 8 — insuffisant : notes 1-2
        $this->insererNotes(8, $cIds, [
            'A001' => 1, 'A002' => 1, 'A003' => 2, 'A004' => 1,
            'B001' => 1, 'B002' => 2, 'B003' => 1, 'B004' => 2,
            'C001' => 1, 'C002' => 1, 'C003' => 2, 'C004' => 1,
        ], [
            'B001' => "14 absences injustifiées sur la période d'essai.",
            'A001' => "N'a pas acquis les compétences techniques minimales requises.",
        ]);

        // ── Historique ────────────────────────────────────────────────────────
        $historiques = [
            [1, 1, 'creation',       '2026-04-05', "Fiche d'évaluation créée."],
            [2, 1, 'creation',       '2025-12-20', "Fiche créée."],
            [2, 2, 'auto_evaluation','2026-06-10', "Fiche envoyée à l'agent pour auto-évaluation."],
            [3, 1, 'creation',       '2026-03-20', "Fiche créée."],
            [3, 2, 'auto_evaluation','2026-06-08', "Fiche envoyée."],
            [3, 3, 'entretien',      '2026-06-18', "Entretien lancé avec le responsable."],
            [4, 1, 'creation',       '2026-02-05', "Fiche créée."],
            [4, 2, 'auto_evaluation','2026-04-24', "Fiche envoyée."],
            [4, 3, 'entretien',      '2026-04-28', "Entretien en cours."],
            [4, 3, 'signe',          '2026-04-29', "Fiche signée par les deux parties."],
            [5, 1, 'creation',       '2025-11-05', "Fiche créée."],
            [5, 2, 'auto_evaluation','2026-04-22', "Fiche envoyée."],
            [5, 3, 'entretien',      '2026-04-27', "Entretien."],
            [5, 3, 'signe',          '2026-04-28', "Signé."],
            [5, 2, 'valide_rrh',     '2026-04-30', "Avis RRH favorable — transmis au DG."],
            [6, 1, 'creation',       '2026-01-10', "Fiche créée."],
            [6, 2, 'auto_evaluation','2026-03-30', "Fiche envoyée."],
            [6, 3, 'entretien',      '2026-04-01', "Entretien."],
            [6, 3, 'signe',          '2026-04-02', "Signé."],
            [6, 2, 'valide_rrh',     '2026-04-04', "Validation RRH — résultats excellents."],
            [6, 1, 'decision_dg',    '2026-04-06', "Confirmation accordée avec mention."],
            [7, 1, 'creation',       '2025-09-05', "Fiche créée."],
            [7, 2, 'auto_evaluation','2026-02-20', "Fiche envoyée."],
            [7, 3, 'entretien',      '2026-02-24', "Entretien."],
            [7, 3, 'signe',          '2026-02-25', "Signé."],
            [7, 2, 'valide_rrh',     '2026-02-27', "Validation RRH."],
            [7, 1, 'decision_dg',    '2026-03-01', "Confirmation accordée."],
            [7, 2, 'archive',        '2026-03-03', "Dossier archivé."],
            [8, 1, 'creation',       '2026-02-07', "Fiche créée."],
            [8, 2, 'auto_evaluation','2026-04-25', "Fiche envoyée."],
            [8, 3, 'entretien',      '2026-04-29', "Entretien."],
            [8, 3, 'signe',          '2026-04-30', "Signé."],
            [8, 2, 'valide_rrh',     '2026-05-02', "Avis RRH : résultats insuffisants, non-confirmation recommandée."],
            [8, 1, 'decision_dg',    '2026-05-03', "Non-confirmation. Procédure administrative engagée."],
            [8, 2, 'archive',        '2026-05-05', "Dossier archivé."],
        ];

        foreach ($historiques as [$evalId, $userId, $etape, $date, $commentaire]) {
            EvaluationHistorique::create([
                'evaluation_id' => $evalId,
                'user_id'       => $userId,
                'etape'         => $etape,
                'commentaire'   => $commentaire,
                'created_at'    => $date,
                'updated_at'    => $date,
            ]);
        }

        $this->command->info("✓ EvaluationSeeder : 12 critères ANASER, 8 évaluations, notes et historique créés.");
    }

    private function insererNotes(int $evalId, $cIds, array $notes, array $commentairesH = []): void
    {
        $criteres = EvaluationCritere::all()->keyBy('code');
        foreach ($notes as $code => $note) {
            $critere = $criteres[$code];
            EvaluationNote::create([
                'evaluation_id'            => $evalId,
                'critere_id'               => $critere->id,
                'note'                     => $note,
                'note_ponderee'            => round($note * $critere->poids, 4),
                'commentaire_hierarchique' => $commentairesH[$code] ?? null,
            ]);
        }
    }
}
