<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PlanFormationSeeder extends Seeder
{
    public function run(): void
    {
        $now     = Carbon::now();
        $deptIds = DB::table('departments')->pluck('id')->toArray();
        $userIds = DB::table('users')->pluck('id')->toArray();
        $empIds  = DB::table('employees')->pluck('id')->toArray();

        $userId1 = $userIds[0];
        $userId2 = $userIds[1] ?? $userIds[0];

        // ─── 1. PRESTATAIRES ──────────────────────────────────────────────
        $prestatairesData = [
            ['nom' => 'Centre National de Formation Professionnelle (CNFP)',  'type' => 'public',   'contact_nom' => 'Directeur Formation', 'telephone' => '338222222'],
            ['nom' => 'Institut Africain de Management (IAM)',                 'type' => 'externe',  'contact_nom' => 'Service Relations Entreprises', 'email' => 'formation@iam.sn', 'telephone' => '338697070'],
            ['nom' => 'Cabinet FORMA-SÉNÉGAL',                                'type' => 'externe',  'contact_nom' => 'Mme Diallo Fatou',   'telephone' => '775001234', 'email' => 'contact@formasenegal.sn'],
            ['nom' => 'ENDSS — École Nationale de Développement Sanitaire et Social', 'type' => 'public', 'contact_nom' => 'Direction Pédagogique', 'telephone' => '338234567'],
            ['nom' => 'Formation Interne ANASER',                             'type' => 'interne',  'contact_nom' => 'RRH ANASER'],
            ['nom' => 'Programme UE – Sécurité Routière Afrique',             'type' => 'bailleurs','contact_nom' => 'Chef de Mission UE',  'email' => 'ue.dakar@eeas.europa.eu'],
        ];

        $prestatairesIds = [];
        foreach ($prestatairesData as $p) {
            $prestatairesIds[] = DB::table('formation_prestataires')->insertGetId(array_merge([
                'statut'     => 'actif',
                'created_at' => $now,
                'updated_at' => $now,
            ], $p));
        }

        // ─── 2. ACTIONS DE FORMATION ──────────────────────────────────────
        $actionsData = [
            // Réglementaires
            ['intitule' => 'Réglementation sécurité routière — mise à jour 2026',       'categorie' => 'reglementaire',          'duree_jours' => 2.0, 'mode' => 'presentiel', 'caractere' => 'obligatoire',    'cout_unitaire_estime' => 50000,  'prestataire_id' => $prestatairesIds[4]],
            ['intitule' => 'Procédures de contrôle technique des véhicules',             'categorie' => 'reglementaire',          'duree_jours' => 3.0, 'mode' => 'presentiel', 'caractere' => 'obligatoire',    'cout_unitaire_estime' => 75000,  'prestataire_id' => $prestatairesIds[0]],
            ['intitule' => 'Agrément auto-écoles : cadre légal et procédures',           'categorie' => 'reglementaire',          'duree_jours' => 1.0, 'mode' => 'presentiel', 'caractere' => 'obligatoire',    'cout_unitaire_estime' => 30000,  'prestataire_id' => $prestatairesIds[4]],
            ['intitule' => 'Code du travail sénégalais & CCNI — actualisation',         'categorie' => 'rh',                     'duree_jours' => 2.0, 'mode' => 'presentiel', 'caractere' => 'obligatoire',    'cout_unitaire_estime' => 45000,  'prestataire_id' => $prestatairesIds[2]],
            ['intitule' => 'Déclarations sociales : IPRES, CSS et DGID',                'categorie' => 'rh',                     'duree_jours' => 1.0, 'mode' => 'presentiel', 'caractere' => 'obligatoire',    'cout_unitaire_estime' => 35000,  'prestataire_id' => $prestatairesIds[2]],
            // Managériales
            ['intitule' => 'Leadership et management d\'équipe',                         'categorie' => 'manageriale',            'duree_jours' => 3.0, 'mode' => 'presentiel', 'caractere' => 'prioritaire',    'cout_unitaire_estime' => 120000, 'prestataire_id' => $prestatairesIds[1]],
            ['intitule' => 'Conduite du changement en organisation publique',            'categorie' => 'manageriale',            'duree_jours' => 2.0, 'mode' => 'mixte',      'caractere' => 'prioritaire',    'cout_unitaire_estime' => 95000,  'prestataire_id' => $prestatairesIds[1]],
            ['intitule' => 'Pilotage de projet et suivi-évaluation',                    'categorie' => 'manageriale',            'duree_jours' => 3.0, 'mode' => 'presentiel', 'caractere' => 'prioritaire',    'cout_unitaire_estime' => 110000, 'prestataire_id' => $prestatairesIds[1]],
            // Métier
            ['intitule' => 'Marchés publics et commande publique au Sénégal',           'categorie' => 'metier',                 'duree_jours' => 3.0, 'mode' => 'presentiel', 'caractere' => 'prioritaire',    'cout_unitaire_estime' => 80000,  'prestataire_id' => $prestatairesIds[2]],
            ['intitule' => 'Excel avancé & tableaux de bord RH',                        'categorie' => 'metier',                 'duree_jours' => 2.0, 'mode' => 'presentiel', 'caractere' => 'prioritaire',    'cout_unitaire_estime' => 60000,  'prestataire_id' => $prestatairesIds[2]],
            ['intitule' => 'Comptabilité publique et contrôle budgétaire',              'categorie' => 'metier',                 'duree_jours' => 3.0, 'mode' => 'presentiel', 'caractere' => 'prioritaire',    'cout_unitaire_estime' => 90000,  'prestataire_id' => $prestatairesIds[0]],
            // Développement personnel
            ['intitule' => 'Techniques de communication et prise de parole',            'categorie' => 'developpement_personnel', 'duree_jours' => 2.0, 'mode' => 'presentiel', 'caractere' => 'complementaire', 'cout_unitaire_estime' => 55000,  'prestataire_id' => $prestatairesIds[2]],
            ['intitule' => 'Anglais professionnel — niveau B1',                         'categorie' => 'developpement_personnel', 'duree_jours' => 5.0, 'mode' => 'distanciel', 'caractere' => 'complementaire', 'cout_unitaire_estime' => 80000,  'prestataire_id' => $prestatairesIds[1]],
            // Intégration
            ['intitule' => 'Formation d\'intégration des nouveaux agents ANASER',       'categorie' => 'integration',            'duree_jours' => 3.0, 'mode' => 'presentiel', 'caractere' => 'obligatoire',    'cout_unitaire_estime' => 0,      'prestataire_id' => $prestatairesIds[4]],
            // Financé bailleur
            ['intitule' => 'Sécurité routière — bonnes pratiques internationales',      'categorie' => 'reglementaire',          'duree_jours' => 5.0, 'mode' => 'mixte',      'caractere' => 'prioritaire',    'cout_unitaire_estime' => 250000, 'prestataire_id' => $prestatairesIds[5]],
        ];

        $actionIds = [];
        foreach ($actionsData as $a) {
            $actionIds[] = DB::table('formation_actions')->insertGetId(array_merge($a, [
                'statut'     => 'actif',
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        // ─── 3. BESOINS ───────────────────────────────────────────────────
        $besoinsData = [
            // Retenus (alimentent le plan 2026)
            ['action_id' => $actionIds[0],  'direction_id' => $deptIds[1], 'source' => 'reglementaire',   'statut' => 'retenu',   'annee' => 2026, 'commentaire' => 'Mise à jour obligatoire annuelle.'],
            ['action_id' => $actionIds[1],  'direction_id' => $deptIds[2], 'source' => 'reglementaire',   'statut' => 'retenu',   'annee' => 2026, 'commentaire' => 'Tous les inspecteurs doivent valider cette formation.'],
            ['action_id' => $actionIds[3],  'direction_id' => $deptIds[1], 'source' => 'rh',              'statut' => 'retenu',   'annee' => 2026, 'commentaire' => 'Actualisation suite aux modifications de la CCNI.'],
            ['action_id' => $actionIds[5],  'direction_id' => $deptIds[3], 'source' => 'direction',       'statut' => 'retenu',   'annee' => 2026, 'commentaire' => 'Renforcement des compétences managériales des chefs de pôle.'],
            ['action_id' => $actionIds[8],  'direction_id' => $deptIds[3], 'source' => 'direction',       'statut' => 'retenu',   'annee' => 2026, 'commentaire' => 'Exigence de la DAF sur les marchés publics.'],
            ['action_id' => $actionIds[9],  'direction_id' => $deptIds[1], 'source' => 'entretien_annuel','statut' => 'retenu',   'annee' => 2026, 'commentaire' => 'Plusieurs agents ont exprimé ce besoin lors des entretiens.'],
            // En collecte
            ['action_id' => $actionIds[6],  'direction_id' => $deptIds[2], 'source' => 'direction',       'statut' => 'collecte', 'annee' => 2026, 'commentaire' => 'Projet de réorganisation interne prévu T3.'],
            ['action_id' => $actionIds[11], 'direction_id' => $deptIds[0], 'source' => 'entretien_annuel','statut' => 'collecte', 'annee' => 2026, 'commentaire' => null],
            ['action_id' => null, 'intitule_libre' => 'Formation SIRH — module congés', 'direction_id' => $deptIds[1], 'source' => 'rh', 'statut' => 'collecte', 'annee' => 2026, 'commentaire' => 'Formation sur le nouveau module SIRH.'],
            // Rejetés
            ['action_id' => $actionIds[12], 'direction_id' => $deptIds[4 % count($deptIds)], 'source' => 'entretien_annuel', 'statut' => 'rejete', 'annee' => 2026, 'commentaire' => 'Hors priorité cette année — budget insuffisant.'],
        ];

        $besoinIds = [];
        foreach ($besoinsData as $b) {
            $besoinIds[] = DB::table('formation_besoins')->insertGetId(array_merge($b, [
                'created_by' => $userId1,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        // ─── 4. PLANS ANNUELS ─────────────────────────────────────────────
        // Plan 2025 — validé DG, exécuté
        $plan2025Id = DB::table('plans_formation')->insertGetId([
            'annee'               => 2025,
            'titre'               => 'Plan de Formation ANASER 2025',
            'periode_debut'       => '2025-01-01',
            'periode_fin'         => '2025-12-31',
            'enveloppe_budgetaire'=> 12_500_000,
            'statut'              => 'valide_dg',
            'valide_par_user_id'  => $userId2,
            'date_validation'     => '2025-01-15 09:00:00',
            'notes'               => 'Plan approuvé par le DG lors du Comité de Direction du 15/01/2025.',
            'created_at'          => $now, 'updated_at' => $now,
        ]);

        // Plan 2026 — brouillon en préparation
        $plan2026Id = DB::table('plans_formation')->insertGetId([
            'annee'               => 2026,
            'titre'               => 'Plan de Formation ANASER 2026',
            'periode_debut'       => '2026-01-01',
            'periode_fin'         => '2026-12-31',
            'enveloppe_budgetaire'=> 18_000_000,
            'statut'              => 'brouillon',
            'valide_par_user_id'  => null,
            'date_validation'     => null,
            'notes'               => "En cours d'arbitrage avec la DAF.",
            'created_at'          => $now, 'updated_at' => $now,
        ]);

        // ─── 5. LIGNES DES PLANS ──────────────────────────────────────────
        // Lignes Plan 2025 (exécuté)
        $lignes2025 = [
            ['action_id' => $actionIds[0],  'besoin_id' => null,           'direction_id' => $deptIds[1], 'nb' => 5,  'cout_u' => 50000,  'fin' => 'budget_propre', 'car' => 'obligatoire',    'dates' => 'Mars 2025'],
            ['action_id' => $actionIds[1],  'besoin_id' => null,           'direction_id' => $deptIds[2], 'nb' => 8,  'cout_u' => 75000,  'fin' => 'budget_propre', 'car' => 'obligatoire',    'dates' => 'Avril 2025'],
            ['action_id' => $actionIds[5],  'besoin_id' => null,           'direction_id' => $deptIds[3], 'nb' => 4,  'cout_u' => 120000, 'fin' => 'budget_propre', 'car' => 'prioritaire',    'dates' => 'Juin 2025'],
            ['action_id' => $actionIds[9],  'besoin_id' => null,           'direction_id' => $deptIds[1], 'nb' => 6,  'cout_u' => 60000,  'fin' => 'budget_propre', 'car' => 'prioritaire',    'dates' => 'Septembre 2025'],
            ['action_id' => $actionIds[13], 'besoin_id' => null,           'direction_id' => $deptIds[0], 'nb' => 3,  'cout_u' => 0,      'fin' => 'budget_propre', 'car' => 'obligatoire',    'dates' => 'Octobre 2025'],
            ['action_id' => $actionIds[14], 'besoin_id' => null,           'direction_id' => $deptIds[2], 'nb' => 2,  'cout_u' => 250000, 'fin' => 'bailleurs',     'car' => 'prioritaire',    'dates' => 'Novembre 2025'],
        ];

        // Lignes Plan 2026 (en préparation)
        $lignes2026 = [
            ['action_id' => $actionIds[0],  'besoin_id' => $besoinIds[0],  'direction_id' => $deptIds[1], 'nb' => 6,  'cout_u' => 50000,  'fin' => 'budget_propre', 'car' => 'obligatoire',    'dates' => 'Fév-Mars 2026'],
            ['action_id' => $actionIds[1],  'besoin_id' => $besoinIds[1],  'direction_id' => $deptIds[2], 'nb' => 10, 'cout_u' => 75000,  'fin' => 'budget_propre', 'car' => 'obligatoire',    'dates' => 'Avril 2026'],
            ['action_id' => $actionIds[3],  'besoin_id' => $besoinIds[2],  'direction_id' => $deptIds[1], 'nb' => 4,  'cout_u' => 45000,  'fin' => 'budget_propre', 'car' => 'obligatoire',    'dates' => 'Mars 2026'],
            ['action_id' => $actionIds[5],  'besoin_id' => $besoinIds[3],  'direction_id' => $deptIds[3], 'nb' => 5,  'cout_u' => 120000, 'fin' => 'budget_propre', 'car' => 'prioritaire',    'dates' => 'Mai 2026'],
            ['action_id' => $actionIds[8],  'besoin_id' => $besoinIds[4],  'direction_id' => $deptIds[3], 'nb' => 8,  'cout_u' => 80000,  'fin' => '3fpt',          'car' => 'prioritaire',    'dates' => 'Juin 2026'],
            ['action_id' => $actionIds[9],  'besoin_id' => $besoinIds[5],  'direction_id' => $deptIds[1], 'nb' => 5,  'cout_u' => 60000,  'fin' => 'budget_propre', 'car' => 'prioritaire',    'dates' => 'Juil 2026'],
            ['action_id' => $actionIds[14], 'besoin_id' => null,           'direction_id' => $deptIds[2], 'nb' => 3,  'cout_u' => 250000, 'fin' => 'bailleurs',     'car' => 'prioritaire',    'dates' => 'Oct 2026'],
        ];

        $ligneIds2025 = [];
        foreach ($lignes2025 as $l) {
            $ligneIds2025[] = DB::table('lignes_plan_formation')->insertGetId([
                'plan_formation_id'    => $plan2025Id,
                'action_id'            => $l['action_id'],
                'besoin_id'            => $l['besoin_id'],
                'direction_id'         => $l['direction_id'],
                'nb_participants_prevu'=> $l['nb'],
                'cout_unitaire'        => $l['cout_u'],
                'cout_total'           => $l['cout_u'] * $l['nb'],
                'source_financement'   => $l['fin'],
                'caractere'            => $l['car'],
                'dates_previsionnelles'=> $l['dates'],
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        $ligneIds2026 = [];
        foreach ($lignes2026 as $l) {
            $ligneIds2026[] = DB::table('lignes_plan_formation')->insertGetId([
                'plan_formation_id'    => $plan2026Id,
                'action_id'            => $l['action_id'],
                'besoin_id'            => $l['besoin_id'],
                'direction_id'         => $l['direction_id'],
                'nb_participants_prevu'=> $l['nb'],
                'cout_unitaire'        => $l['cout_u'],
                'cout_total'           => $l['cout_u'] * $l['nb'],
                'source_financement'   => $l['fin'],
                'caractere'            => $l['car'],
                'dates_previsionnelles'=> $l['dates'],
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        // ─── 6. SESSIONS (Plan 2025 — réalisées) ─────────────────────────
        $sessionsData = [
            ['ligne_id' => $ligneIds2025[0], 'debut' => '2025-03-10', 'fin' => '2025-03-11', 'lieu' => 'Salle de réunion ANASER',    'prest_id' => $prestatairesIds[4], 'nb_reel' => 5,  'cout_reel' => 250000,  'statut' => 'realisee'],
            ['ligne_id' => $ligneIds2025[1], 'debut' => '2025-04-07', 'fin' => '2025-04-09', 'lieu' => 'CNFP — Dakar',               'prest_id' => $prestatairesIds[0], 'nb_reel' => 8,  'cout_reel' => 600000,  'statut' => 'realisee'],
            ['ligne_id' => $ligneIds2025[2], 'debut' => '2025-06-16', 'fin' => '2025-06-18', 'lieu' => 'Hôtel Terrou-Bi',            'prest_id' => $prestatairesIds[1], 'nb_reel' => 4,  'cout_reel' => 480000,  'statut' => 'realisee'],
            ['ligne_id' => $ligneIds2025[3], 'debut' => '2025-09-08', 'fin' => '2025-09-09', 'lieu' => 'Salle de formation ANASER',  'prest_id' => $prestatairesIds[2], 'nb_reel' => 6,  'cout_reel' => 360000,  'statut' => 'realisee'],
            ['ligne_id' => $ligneIds2025[4], 'debut' => '2025-10-20', 'fin' => '2025-10-22', 'lieu' => 'ANASER — Siège',             'prest_id' => $prestatairesIds[4], 'nb_reel' => 3,  'cout_reel' => 0,       'statut' => 'realisee'],
            ['ligne_id' => $ligneIds2025[5], 'debut' => '2025-11-03', 'fin' => '2025-11-07', 'lieu' => 'Centre Coopération UE',      'prest_id' => $prestatairesIds[5], 'nb_reel' => 2,  'cout_reel' => 500000,  'statut' => 'realisee'],
            // 2026 — planifiées
            ['ligne_id' => $ligneIds2026[0], 'debut' => '2026-02-16', 'fin' => '2026-02-17', 'lieu' => 'Salle ANASER',              'prest_id' => $prestatairesIds[4], 'nb_reel' => null,'cout_reel' => null,    'statut' => 'realisee'],
            ['ligne_id' => $ligneIds2026[1], 'debut' => '2026-04-06', 'fin' => '2026-04-08', 'lieu' => 'CNFP — Dakar',              'prest_id' => $prestatairesIds[0], 'nb_reel' => null,'cout_reel' => null,    'statut' => 'en_cours'],
            ['ligne_id' => $ligneIds2026[2], 'debut' => '2026-03-17', 'fin' => '2026-03-18', 'lieu' => 'Cabinet FORMA-SÉNÉGAL',     'prest_id' => $prestatairesIds[2], 'nb_reel' => null,'cout_reel' => null,    'statut' => 'realisee'],
            ['ligne_id' => $ligneIds2026[3], 'debut' => '2026-05-25', 'fin' => '2026-05-27', 'lieu' => 'IAM — Dakar',               'prest_id' => $prestatairesIds[1], 'nb_reel' => null,'cout_reel' => null,    'statut' => 'planifiee'],
            ['ligne_id' => $ligneIds2026[4], 'debut' => '2026-06-09', 'fin' => '2026-06-11', 'lieu' => 'Cabinet FORMA-SÉNÉGAL',     'prest_id' => $prestatairesIds[2], 'nb_reel' => null,'cout_reel' => null,    'statut' => 'planifiee'],
        ];

        $sessionIds = [];
        foreach ($sessionsData as $s) {
            $sessionIds[] = DB::table('formation_sessions')->insertGetId([
                'ligne_plan_id'        => $s['ligne_id'],
                'date_debut'           => $s['debut'],
                'date_fin'             => $s['fin'],
                'lieu'                 => $s['lieu'],
                'prestataire_id'       => $s['prest_id'],
                'nb_participants_reel' => $s['nb_reel'],
                'cout_reel'            => $s['cout_reel'],
                'statut'               => $s['statut'],
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        // ─── 7. INSCRIPTIONS ──────────────────────────────────────────────
        $inscriptionIds = [];
        if (count($empIds) >= 3) {
            // Sessions réalisées 2025 — inscriptions certifiées
            $groupes = [
                [$sessionIds[0], array_slice($empIds, 0, 5)],
                [$sessionIds[1], array_slice($empIds, 0, 8)],
                [$sessionIds[2], array_slice($empIds, 0, 4)],
                [$sessionIds[3], array_slice($empIds, 0, 6)],
            ];

            foreach ($groupes as [$sessionId, $empGroup]) {
                foreach ($empGroup as $empId) {
                    $inscriptionIds[] = DB::table('formation_inscriptions')->insertGetId([
                        'session_id'       => $sessionId,
                        'employee_id'      => $empId,
                        'statut'           => 'certifie',
                        'date_attestation' => Carbon::parse($sessionsData[array_search($sessionId, $sessionIds)]['fin'] ?? $now)->addDays(3)->toDateString(),
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }

            // Session 2026 en cours — présents
            if (isset($sessionIds[7])) {
                foreach (array_slice($empIds, 0, min(3, count($empIds))) as $empId) {
                    $inscriptionIds[] = DB::table('formation_inscriptions')->insertGetId([
                        'session_id'  => $sessionIds[7],
                        'employee_id' => $empId,
                        'statut'      => 'present',
                        'created_at'  => $now, 'updated_at' => $now,
                    ]);
                }
            }
        }

        // ─── 8. ÉVALUATIONS ───────────────────────────────────────────────
        if (!empty($inscriptionIds)) {
            // Évaluations à chaud sur les 8 premières inscriptions certifiées
            $scoresChaud = [88, 92, 75, 85, 90, 78, 95, 82];
            foreach (array_slice($inscriptionIds, 0, min(8, count($inscriptionIds))) as $i => $inscId) {
                DB::table('formation_evaluations')->insertOrIgnore([
                    'inscription_id'   => $inscId,
                    'type'             => 'a_chaud',
                    'score'            => $scoresChaud[$i] ?? 80,
                    'commentaire'      => 'Formateur compétent, supports de qualité.',
                    'evalue_par_user_id'=> $userId1,
                    'date_evaluation'  => Carbon::now()->subMonths(6)->toDateString(),
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }

            // Évaluations acquis J+30 sur les 6 premières
            $scoresAcquis = [80, 88, 70, 78, 85, 72];
            foreach (array_slice($inscriptionIds, 0, min(6, count($inscriptionIds))) as $i => $inscId) {
                DB::table('formation_evaluations')->insertOrIgnore([
                    'inscription_id'   => $inscId,
                    'type'             => 'acquis_j30',
                    'score'            => $scoresAcquis[$i] ?? 75,
                    'commentaire'      => 'Bonne assimilation des concepts clés.',
                    'evalue_par_user_id'=> $userId1,
                    'date_evaluation'  => Carbon::now()->subMonths(5)->toDateString(),
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }

            // Évaluations transfert N+90 sur les 4 premières
            $scoresTransfert = [72, 80, 65, 75];
            foreach (array_slice($inscriptionIds, 0, min(4, count($inscriptionIds))) as $i => $inscId) {
                DB::table('formation_evaluations')->insertOrIgnore([
                    'inscription_id'   => $inscId,
                    'type'             => 'transfert_n90',
                    'score'            => $scoresTransfert[$i] ?? 70,
                    'commentaire'      => 'Application effective des acquis en situation de travail.',
                    'evalue_par_user_id'=> $userId2,
                    'date_evaluation'  => Carbon::now()->subMonths(3)->toDateString(),
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        }

        $this->command->info('✓ PlanFormationSeeder :' .
            ' prestataires=' . count($prestatairesIds) .
            ' actions=' . count($actionIds) .
            ' besoins=' . count($besoinIds) .
            ' plans=2' .
            ' lignes=' . (count($ligneIds2025) + count($ligneIds2026)) .
            ' sessions=' . count($sessionIds) .
            ' inscriptions=' . count($inscriptionIds) .
            ' évaluations créées.');
    }
}
