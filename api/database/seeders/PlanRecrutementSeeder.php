<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PlanRecrutementSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // Récupérer des IDs existants
        $deptIds  = DB::table('departments')->pluck('id')->toArray();
        $userIds  = DB::table('users')->pluck('id')->toArray();
        $userId1  = $userIds[0];
        $userId2  = $userIds[1] ?? $userIds[0];

        // ─── 1. POSTES ───────────────────────────────────────────────────
        $postesData = [
            ['titre' => 'Directeur des Ressources Humaines',        'classification_ccni' => 'A1', 'type_contrat_defaut' => 'CDI',    'direction_id' => $deptIds[1]],
            ['titre' => 'Responsable Paie et Administration',       'classification_ccni' => 'A2', 'type_contrat_defaut' => 'CDI',    'direction_id' => $deptIds[1]],
            ['titre' => 'Chargé de Recrutement',                    'classification_ccni' => 'B1', 'type_contrat_defaut' => 'CDI',    'direction_id' => $deptIds[1]],
            ['titre' => 'Ingénieur Informatique',                   'classification_ccni' => 'A2', 'type_contrat_defaut' => 'CDI',    'direction_id' => $deptIds[2]],
            ['titre' => 'Développeur Full-Stack',                   'classification_ccni' => 'B1', 'type_contrat_defaut' => 'CDI',    'direction_id' => $deptIds[2]],
            ['titre' => 'Analyste Financier',                       'classification_ccni' => 'A2', 'type_contrat_defaut' => 'CDI',    'direction_id' => $deptIds[3]],
            ['titre' => 'Comptable Principal',                      'classification_ccni' => 'B1', 'type_contrat_defaut' => 'CDI',    'direction_id' => $deptIds[3]],
            ['titre' => "Juriste d'Entreprise",                     'classification_ccni' => 'A1', 'type_contrat_defaut' => 'DECRET', 'direction_id' => $deptIds[4]],
            ['titre' => 'Auditeur Interne',                         'classification_ccni' => 'A2', 'type_contrat_defaut' => 'CDI',    'direction_id' => $deptIds[4]],
            ['titre' => 'Technicien de Maintenance',                'classification_ccni' => 'C1', 'type_contrat_defaut' => 'CDD',    'direction_id' => $deptIds[5 % count($deptIds)]],
            ['titre' => 'Assistant Administratif',                  'classification_ccni' => 'C2', 'type_contrat_defaut' => 'CDD',    'direction_id' => $deptIds[0]],
            ['titre' => 'Stagiaire Marketing Digital',              'classification_ccni' => 'C2', 'type_contrat_defaut' => 'Stage',  'direction_id' => $deptIds[1]],
        ];

        $posteIds = [];
        foreach ($postesData as $p) {
            $posteIds[] = DB::table('plan_postes')->insertGetId(array_merge($p, [
                'statut'     => 'actif',
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        // ─── 2. BESOINS ──────────────────────────────────────────────────
        $besoinsData = [
            // validés
            ['poste_id' => $posteIds[2],  'direction_id' => $deptIds[1],  'motif' => 'depart',       'date_constat' => '2026-01-10', 'statut' => 'valide',   'description' => 'Départ en retraite du chargé de recrutement sortant.'],
            ['poste_id' => $posteIds[3],  'direction_id' => $deptIds[2],  'motif' => 'nouveau_besoin','date_constat' => '2026-01-15', 'statut' => 'valide',   'description' => "Renforcement de l'équipe SI pour le projet ERP."],
            ['poste_id' => $posteIds[5],  'direction_id' => $deptIds[3],  'motif' => 'nouveau_besoin','date_constat' => '2026-02-01', 'statut' => 'valide',   'description' => 'Création du pôle analyse financière.'],
            ['poste_id' => $posteIds[4],  'direction_id' => $deptIds[2],  'motif' => 'projet',       'date_constat' => '2026-02-10', 'statut' => 'valide',   'description' => 'Développement du portail agent.'],
            ['poste_id' => $posteIds[6],  'direction_id' => $deptIds[3],  'motif' => 'depart',       'date_constat' => '2026-03-05', 'statut' => 'valide',   'description' => 'Remplacement suite à mutation interne.'],
            // en collecte
            ['poste_id' => $posteIds[7],  'direction_id' => $deptIds[4],  'motif' => 'nouveau_besoin','date_constat' => '2026-04-01', 'statut' => 'collecte', 'description' => "Besoin juridique croissant lié aux appels d'offres."],
            ['poste_id' => $posteIds[9],  'direction_id' => $deptIds[5 % count($deptIds)], 'motif' => 'depart', 'date_constat' => '2026-04-12', 'statut' => 'collecte', 'description' => 'Technicien sortant — poste à renouveler.'],
            ['poste_id' => $posteIds[11], 'direction_id' => $deptIds[1],  'motif' => 'projet',       'date_constat' => '2026-05-20', 'statut' => 'collecte', 'description' => 'Campagne de communication digitale Q3 2026.'],
            // rejeté
            ['poste_id' => $posteIds[10], 'direction_id' => $deptIds[0],  'motif' => 'nouveau_besoin','date_constat' => '2026-01-25', 'statut' => 'rejete',   'description' => 'Poste non prioritaire — budget insuffisant.'],
        ];

        $besoinIds = [];
        foreach ($besoinsData as $b) {
            $besoinIds[] = DB::table('besoins_recrutement')->insertGetId(array_merge($b, [
                'created_by' => $userId1,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        // ─── 3. PLANS ANNUELS ─────────────────────────────────────────────
        $planIds = [];

        // Plan 2025 — validé DG
        $planIds[] = DB::table('plans_recrutement')->insertGetId([
            'annee'               => 2025,
            'titre'               => 'Plan de Recrutement 2025',
            'periode_debut'       => '2025-01-01',
            'periode_fin'         => '2025-12-31',
            'enveloppe_budgetaire'=> 85_000_000,
            'statut'              => 'valide_dg',
            'valide_par_user_id'  => $userId2,
            'date_validation'     => '2025-01-20 09:00:00',
            'notes'               => 'Plan approuvé lors du conseil de direction du 20/01/2025.',
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);

        // Plan 2026 — brouillon
        $planIds[] = DB::table('plans_recrutement')->insertGetId([
            'annee'               => 2026,
            'titre'               => 'Plan de Recrutement 2026',
            'periode_debut'       => '2026-01-01',
            'periode_fin'         => '2026-12-31',
            'enveloppe_budgetaire'=> 120_000_000,
            'statut'              => 'brouillon',
            'valide_par_user_id'  => null,
            'date_validation'     => null,
            'notes'               => "En cours d'arbitrage budgétaire.",
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);

        // ─── 4. LIGNES DE PLAN ────────────────────────────────────────────
        // Helper : score = (u*3 + i*3 + b*2 + m*2) / 40 * 100
        $score = fn($u, $i, $b, $m) => round(($u*3 + $i*3 + $b*2 + $m*2) / 40 * 100, 2);

        $lignesData = [
            // Plan 2025
            ['plan_id' => $planIds[0], 'besoin_id' => $besoinIds[0], 'classif' => 'B1', 'type' => 'CDI',    'duree' => null, 'salaire' => 450000,  'u' => 5, 'i' => 4, 'b' => 4, 'm' => 3],
            ['plan_id' => $planIds[0], 'besoin_id' => $besoinIds[1], 'classif' => 'A2', 'type' => 'CDI',    'duree' => null, 'salaire' => 750000,  'u' => 5, 'i' => 5, 'b' => 3, 'm' => 2],
            ['plan_id' => $planIds[0], 'besoin_id' => $besoinIds[4], 'classif' => 'B1', 'type' => 'CDI',    'duree' => null, 'salaire' => 380000,  'u' => 4, 'i' => 3, 'b' => 5, 'm' => 4],
            ['plan_id' => $planIds[0], 'besoin_id' => null,          'classif' => 'C1', 'type' => 'CDD',    'duree' => 12,   'salaire' => 200000,  'u' => 3, 'i' => 2, 'b' => 4, 'm' => 5],
            // Plan 2026
            ['plan_id' => $planIds[1], 'besoin_id' => $besoinIds[2], 'classif' => 'A2', 'type' => 'CDI',    'duree' => null, 'salaire' => 820000,  'u' => 5, 'i' => 5, 'b' => 4, 'm' => 3],
            ['plan_id' => $planIds[1], 'besoin_id' => $besoinIds[3], 'classif' => 'B1', 'type' => 'CDI',    'duree' => null, 'salaire' => 550000,  'u' => 4, 'i' => 4, 'b' => 3, 'm' => 4],
            ['plan_id' => $planIds[1], 'besoin_id' => $besoinIds[5], 'classif' => 'A1', 'type' => 'DECRET', 'duree' => null, 'salaire' => 950000,  'u' => 4, 'i' => 5, 'b' => 3, 'm' => 2],
            ['plan_id' => $planIds[1], 'besoin_id' => null,          'classif' => 'C2', 'type' => 'Stage',  'duree' => 6,    'salaire' => 100000,  'u' => 2, 'i' => 1, 'b' => 5, 'm' => 4],
        ];

        $ligneIds = [];
        foreach ($lignesData as $l) {
            $duree = $l['duree'] ?? 12;
            $cout  = round($l['salaire'] * 1.28 * $duree, 2);
            $ligneIds[] = DB::table('lignes_plan')->insertGetId([
                'plan_recrutement_id'    => $l['plan_id'],
                'besoin_id'              => $l['besoin_id'],
                'classification_ccni'    => $l['classif'],
                'type_contrat'           => $l['type'],
                'duree_cdd'              => $l['duree'],
                'salaire_base_estime'    => $l['salaire'],
                'cout_estime'            => $cout,
                'urgence_operationnelle' => $l['u'],
                'impact_reglementaire'   => $l['i'],
                'disponibilite_budgetaire' => $l['b'],
                'profil_marche_disponible' => $l['m'],
                'priorite_score'         => $score($l['u'], $l['i'], $l['b'], $l['m']),
                'notes'                  => null,
                'created_at'             => $now,
                'updated_at'             => $now,
            ]);
        }

        // ─── 5. PROCESSUS DE RECRUTEMENT ─────────────────────────────────
        $etapes = [
            'analyse_besoin', 'elaboration_fiche', 'publication', 'selection_cv',
            'tests_ecrits', 'entretien_rh', 'entretien_commission',
            'deliberation', 'decision_dg', 'integration', 'essai', 'cloture',
        ];

        $processusConfigs = [
            // Processus avancé (étape 9 — decision_dg)
            ['ligne_id' => $ligneIds[0], 'etape_index' => 8, 'statut' => 'en_cours',  'demarrage' => '2025-02-01'],
            // Processus en entretien commission (étape 6)
            ['ligne_id' => $ligneIds[1], 'etape_index' => 6, 'statut' => 'en_cours',  'demarrage' => '2025-03-15'],
            // Processus clôturé avec succès
            ['ligne_id' => $ligneIds[2], 'etape_index' => 11,'statut' => 'cloture',   'demarrage' => '2025-01-10'],
            // Processus en sélection CV (étape 3)
            ['ligne_id' => $ligneIds[3], 'etape_index' => 3, 'statut' => 'en_cours',  'demarrage' => '2025-05-01'],
            // Processus 2026 — démarrage récent (analyse besoin)
            ['ligne_id' => $ligneIds[4], 'etape_index' => 1, 'statut' => 'en_cours',  'demarrage' => '2026-02-10'],
            // Processus 2026 — en cours tests écrits
            ['ligne_id' => $ligneIds[5], 'etape_index' => 4, 'statut' => 'en_cours',  'demarrage' => '2026-01-20'],
        ];

        $processusIds = [];
        foreach ($processusConfigs as $pc) {
            $processusIds[] = DB::table('processus_recrutement')->insertGetId([
                'ligne_plan_id'  => $pc['ligne_id'],
                'etape_courante' => $etapes[$pc['etape_index']],
                'statut'         => $pc['statut'],
                'date_demarrage' => $pc['demarrage'],
                'notes'          => null,
                'created_at'     => $now,
                'updated_at'     => $now,
            ]);
        }

        // ─── 6. HISTORIQUE DES ÉTAPES ────────────────────────────────────
        foreach ($processusIds as $pidx => $processusId) {
            $etapeIndex = $processusConfigs[$pidx]['etape_index'];
            $base = Carbon::parse($processusConfigs[$pidx]['demarrage']);

            for ($i = 0; $i <= $etapeIndex; $i++) {
                $dateEntree  = $base->copy()->addDays($i * 5);
                $dateSortie  = ($i < $etapeIndex) ? $dateEntree->copy()->addDays(5) : null;

                DB::table('etapes_historique')->insert([
                    'processus_id'       => $processusId,
                    'etape'              => $etapes[$i],
                    'date_entree'        => $dateEntree,
                    'date_sortie'        => $dateSortie,
                    'valide_par_user_id' => $dateSortie ? $userId1 : null,
                    'role_validateur'    => $dateSortie ? 'RRH' : null,
                    'commentaire'        => $dateSortie ? 'Étape validée.' : 'En cours.',
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ]);
            }
        }

        // ─── 7. MEMBRES COMMISSION ───────────────────────────────────────
        // Pour les processus en phase commission ou plus
        $commissionProcessus = array_filter($processusIds, fn($_, $i) =>
            $processusConfigs[$i]['etape_index'] >= 6, ARRAY_FILTER_USE_BOTH);

        $roles = ['president', 'rrh', 'expert_technique'];
        foreach ($commissionProcessus as $processusId) {
            foreach (array_slice($userIds, 0, min(3, count($userIds))) as $ridx => $uid) {
                DB::table('commission_membres')->insertOrIgnore([
                    'processus_id' => $processusId,
                    'user_id'      => $uid,
                    'role'         => $roles[$ridx],
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);
            }
        }

        // ─── 8. CANDIDATURES ─────────────────────────────────────────────
        $candidats = [
            ['nom' => 'Diallo',   'prenom' => 'Mamadou',    'email' => 'mdiallo@gmail.com',    'tel' => '775001234'],
            ['nom' => 'Sow',      'prenom' => 'Fatoumata',  'email' => 'fsow@outlook.com',      'tel' => '776112233'],
            ['nom' => 'Ndiaye',   'prenom' => 'Ibrahima',   'email' => 'indiaye@yahoo.fr',      'tel' => '777223344'],
            ['nom' => 'Fall',     'prenom' => 'Aminata',    'email' => 'afall@gmail.com',       'tel' => '778334455'],
            ['nom' => 'Ba',       'prenom' => 'Ousmane',    'email' => 'oba@gmail.com',         'tel' => '779445566'],
            ['nom' => 'Camara',   'prenom' => 'Aissatou',   'email' => 'acamara@hotmail.com',   'tel' => '770556677'],
            ['nom' => 'Touré',    'prenom' => 'Seydou',     'email' => 'stoure@gmail.com',      'tel' => '771667788'],
            ['nom' => 'Konaté',   'prenom' => 'Mariam',     'email' => 'mkonat@gmail.com',      'tel' => '772778899'],
            ['nom' => 'Sarr',     'prenom' => 'Papa Demba', 'email' => 'pdsarr@gmail.com',      'tel' => '773889900'],
            ['nom' => 'Gueye',    'prenom' => 'Ndèye Marie','email' => 'nmgueye@outlook.com',   'tel' => '774990011'],
            ['nom' => 'Diouf',    'prenom' => 'Cheikh',     'email' => 'cdiouf@gmail.com',      'tel' => '775101112'],
            ['nom' => 'Mbaye',    'prenom' => 'Rokhaya',    'email' => 'rmbaye@yahoo.fr',       'tel' => '776112345'],
        ];

        // Processus 0 (decision_dg) — 4 candidats avancés
        $statuts0 = ['retenu', 'rejete', 'rejete', 'entretien'];
        $scores0  = [88.5, 62.0, 55.0, 74.0];
        for ($i = 0; $i < 4; $i++) {
            DB::table('candidatures_plan')->insert([
                'processus_id' => $processusIds[0],
                'nom'          => $candidats[$i]['nom'],
                'prenom'       => $candidats[$i]['prenom'],
                'email'        => $candidats[$i]['email'],
                'telephone'    => $candidats[$i]['tel'],
                'statut'       => $statuts0[$i],
                'score'        => $scores0[$i],
                'notes'        => $i === 0 ? 'Candidat retenu — profil excellent.' : null,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }

        // Processus 1 (entretien commission) — 5 candidats
        $statuts1 = ['entretien', 'entretien', 'shortliste', 'rejete', 'rejete'];
        $scores1  = [79.0, 81.5, 68.0, 45.0, 50.0];
        for ($i = 0; $i < 5; $i++) {
            DB::table('candidatures_plan')->insert([
                'processus_id' => $processusIds[1],
                'nom'          => $candidats[$i + 4]['nom'],
                'prenom'       => $candidats[$i + 4]['prenom'],
                'email'        => $candidats[$i + 4]['email'],
                'telephone'    => $candidats[$i + 4]['tel'],
                'statut'       => $statuts1[$i],
                'score'        => $scores1[$i],
                'notes'        => null,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }

        // Processus 3 (selection_cv) — 6 candidats reçus/shortlistés
        $statuts3 = ['shortliste', 'shortliste', 'recu', 'recu', 'recu', 'rejete'];
        $scores3  = [72.0, 69.5, null, null, null, 35.0];
        for ($i = 0; $i < 6; $i++) {
            $c = $candidats[$i % count($candidats)];
            DB::table('candidatures_plan')->insert([
                'processus_id' => $processusIds[3],
                'nom'          => $c['nom'],
                'prenom'       => $c['prenom'],
                'email'        => $c['email'],
                'telephone'    => $c['tel'],
                'statut'       => $statuts3[$i],
                'score'        => $scores3[$i],
                'notes'        => null,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }

        // Processus 4 et 5 (2026) — quelques candidatures reçues
        for ($i = 0; $i < 3; $i++) {
            $c = $candidats[$i];
            DB::table('candidatures_plan')->insert([
                'processus_id' => $processusIds[4],
                'nom'          => $c['nom'],
                'prenom'       => $c['prenom'],
                'email'        => $c['email'],
                'telephone'    => $c['tel'],
                'statut'       => 'recu',
                'score'        => null,
                'notes'        => null,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }

        $this->command->info('✓ PlanRecrutementSeeder : postes=' . count($posteIds)
            . ' besoins=' . count($besoinIds)
            . ' plans=' . count($planIds)
            . ' lignes=' . count($ligneIds)
            . ' processus=' . count($processusIds)
            . ' candidatures créées.');
    }
}
