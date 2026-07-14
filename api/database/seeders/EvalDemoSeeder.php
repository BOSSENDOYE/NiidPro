<?php

namespace Database\Seeders;

use App\Models\EvalAudit;
use App\Models\EvalBesoinFormation;
use App\Models\EvalCampagne;
use App\Models\EvalCritere;
use App\Models\EvalDecisionRh;
use App\Models\EvalFiche;
use App\Models\EvalNotation;
use App\Models\EvalObjectif;
use App\Models\Employee;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EvalDemoSeeder extends Seeder
{
    // Notes réalistes par profil d'agent
    private array $profils = [
        'excellent'        => [4, 5, 5, 5, 4, 5, 4, 5, 4, 5, 5, 4],
        'tres_satisfaisant'=> [4, 4, 4, 3, 4, 4, 4, 3, 4, 4, 3, 4],
        'satisfaisant'     => [3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3],
        'a_ameliorer'      => [2, 2, 3, 2, 2, 2, 3, 2, 2, 2, 3, 2],
        'insuffisant'      => [1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
    ];

    private array $realisations = [
        "Coordination des activités de sensibilisation routière dans 3 régions. Organisation de 12 ateliers de formation avec 450 participants. Rédaction du rapport trimestriel de la Direction.",
        "Traitement de 1 200 dossiers de permis de conduire sur la période. Réduction des délais de traitement de 30%. Mise en place d'un système de suivi des dossiers.",
        "Supervision technique des contrôles techniques périodiques. Formation de 8 techniciens. Amélioration du taux de conformité des véhicules contrôlés.",
        "Gestion administrative des correspondances et archives. Accueil et orientation des usagers. Tenue des registres de présence et de la messagerie institutionnelle.",
        "Appui à la préparation des budgets prévisionnels. Traitement des bons de commande. Participation aux inventaires trimestriels.",
    ];

    private array $difficultes = [
        "Manque de ressources matérielles pour certaines missions terrain. Délais administratifs parfois longs pour l'obtention des autorisations.",
        "Volume important de dossiers en période de renouvellement de permis. Effectifs insuffisants lors des pics d'activité.",
        "Difficultés de communication avec certains partenaires externes. Problèmes d'accès à certaines zones rurales.",
        "Besoin de renforcement des outils informatiques. Certaines procédures méritent d'être simplifiées.",
        "Manque de formation sur les nouvelles réglementations. Coordination à améliorer entre les divisions.",
    ];

    private array $fonctions = [
        'Chargé de Sensibilisation Routière',
        'Technicien Contrôle Technique',
        'Agent de Guichet',
        'Responsable Administratif',
        'Comptable',
        'Chargé de Communication',
        'Inspecteur de Sécurité Routière',
        'Assistant RH',
        'Juriste',
        'Informaticien',
        'Chauffeur',
        'Gardien',
    ];

    private array $directions = [
        'Direction de la Sécurité Routière',
        'Direction Administrative et Financière',
        'Direction des Systèmes d\'Information',
        'Division des Ressources Humaines',
        'Division Juridique',
        'Division Communication',
    ];

    private array $besoinsFormation = [
        ['intitule' => 'Formation en sécurité routière avancée', 'priorite' => 'haute'],
        ['intitule' => 'Maîtrise du logiciel de gestion RH', 'priorite' => 'haute'],
        ['intitule' => 'Techniques de communication institutionnelle', 'priorite' => 'moyenne'],
        ['intitule' => 'Gestion de projet et planification', 'priorite' => 'moyenne'],
        ['intitule' => 'Formation en bureautique avancée', 'priorite' => 'faible'],
        ['intitule' => 'Anglais professionnel', 'priorite' => 'faible'],
        ['intitule' => 'Leadership et management d\'équipe', 'priorite' => 'haute'],
        ['intitule' => 'Comptabilité publique', 'priorite' => 'moyenne'],
        ['intitule' => 'Réglementation du code de la route', 'priorite' => 'haute'],
        ['intitule' => 'Archivage et gestion documentaire', 'priorite' => 'faible'],
    ];

    private array $objectifs = [
        ['objectif' => 'Organiser 15 campagnes de sensibilisation en région', 'indicateur' => 'Nombre de campagnes réalisées', 'echeance' => '2026-12-31'],
        ['objectif' => 'Réduire les délais de traitement des dossiers de 20%', 'indicateur' => 'Délai moyen de traitement', 'echeance' => '2026-06-30'],
        ['objectif' => 'Former 10 nouveaux agents sur les procédures internes', 'indicateur' => 'Nombre d\'agents formés', 'echeance' => '2026-09-30'],
        ['objectif' => 'Mettre à jour le manuel de procédures de la division', 'indicateur' => 'Manuel validé et diffusé', 'echeance' => '2026-03-31'],
        ['objectif' => 'Améliorer le taux de satisfaction des usagers à 85%', 'indicateur' => 'Enquête satisfaction annuelle', 'echeance' => '2026-12-31'],
        ['objectif' => 'Contribuer à la digitalisation de 3 procédures administratives', 'indicateur' => 'Procédures numérisées', 'echeance' => '2026-10-31'],
    ];

    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('eval_audit')->truncate();
        DB::table('eval_decisions_rh')->truncate();
        DB::table('eval_objectifs')->truncate();
        DB::table('eval_besoins_formation')->truncate();
        DB::table('eval_notations')->truncate();
        DB::table('eval_fiches')->truncate();
        DB::table('eval_campagnes')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $criteres  = EvalCritere::where('actif', true)->orderBy('ordre')->get();
        $baseCrit  = $criteres->where('categorie', 'base')->values();
        $compCrit  = $criteres->where('categorie', 'complementaire')->values();
        $fonctCrit = $criteres->where('categorie', 'fonctionnaire')->values();

        $employees = Employee::where('status', 'active')->get();
        $userIds   = [1, 2, 3, 4];

        // ── Campagne 2025 — Clôturée (toutes fiches archivées) ─────────────────
        $camp2025 = EvalCampagne::create([
            'exercice'                  => 2025,
            'titre'                     => 'Campagne d\'évaluation annuelle 2025',
            'statut'                    => 'cloturee',
            'periode_debut'             => '2025-01-01',
            'periode_fin'               => '2025-12-31',
            'date_lancement'            => '2025-10-01',
            'date_limite_planification' => '2025-10-15',
            'date_limite_entretiens'    => '2025-11-15',
            'date_limite_transmission'  => '2025-11-30',
            'date_limite_synthese'      => '2025-12-15',
            'date_cloture'              => '2025-12-31',
            'cree_par'                  => 1,
            'lance_par'                 => 1,
            'lance_at'                  => '2025-10-01 08:00:00',
        ]);

        // 20 fiches archivées pour 2025
        $sample2025 = $employees->random(min(20, $employees->count()));
        foreach ($sample2025 as $emp) {
            $profilKey = $this->randomProfil();
            $statAgent = $this->statutAgent($emp);
            $direction = $this->directions[array_rand($this->directions)];
            $anciennete = $emp->hire_date ? (int) Carbon::parse($emp->hire_date)->diffInMonths('2025-01-01') : 24;

            $fiche = EvalFiche::create([
                'campagne_id'             => $camp2025->id,
                'employee_id'             => $emp->id,
                'evaluateur_id'           => $userIds[array_rand($userIds)],
                'statut'                  => 'archivee',
                'statut_agent'            => $statAgent,
                'snapshot_matricule'      => $emp->employee_number,
                'snapshot_fonction'       => $emp->fonction ?? $this->fonctions[array_rand($this->fonctions)],
                'snapshot_direction'      => $direction,
                'snapshot_service'        => 'Service ' . chr(rand(65, 70)),
                'snapshot_superieur'      => 'M. ' . ['DIALLO', 'FALL', 'NDIAYE', 'SECK'][array_rand(['DIALLO', 'FALL', 'NDIAYE', 'SECK'])],
                'snapshot_anciennete_mois'=> $anciennete,
                'date_entretien'          => '2025-11-05',
                'lieu_entretien'          => 'Salle de conférence ANASER',
                'entretien_tenu'          => true,
                'entretien_tenu_at'       => '2025-11-05 10:00:00',
                'realisations'            => $this->realisations[array_rand($this->realisations)],
                'difficultes'             => $this->difficultes[array_rand($this->difficultes)],
                'competences_demontrees'  => 'Rigueur professionnelle, sens de l\'organisation, maîtrise des outils bureautiques, esprit d\'équipe.',
                'observations_evaluateur' => 'Agent sérieux et impliqué. Mérite encouragement et suivi pour progresser.',
                'observations_agent'      => 'Je m\'engage à améliorer mes performances sur les points identifiés.',
                'signe_evaluateur_at'     => '2025-11-10 14:00:00',
                'signe_agent_at'          => '2025-11-12 09:00:00',
                'transmise_daf_at'        => '2025-11-15 08:00:00',
                'notifiee_at'             => '2025-12-10 10:00:00',
                'archivee_at'             => '2025-12-20 16:00:00',
                'daf_user_id'             => 2,
                'dg_user_id'              => 1,
                'avis_dg'                 => 'Bon travail. Encourager la participation aux formations.',
            ]);

            $this->insererNotations($fiche, $baseCrit, $compCrit, $statAgent === 'fonctionnaire' ? $fonctCrit : collect(), $profilKey);
            $fiche->recalculerMoyenne();
            $this->insererBesoins($fiche, rand(1, 3));
            $this->insererObjectifs($fiche, rand(2, 3));
            $this->insererDecision($fiche, 1, $profilKey);
        }

        // ── Campagne 2026 — Active (fiches à divers stades) ────────────────────
        $camp2026 = EvalCampagne::create([
            'exercice'                  => 2026,
            'titre'                     => 'Campagne d\'évaluation annuelle 2026',
            'statut'                    => 'active',
            'periode_debut'             => '2026-01-01',
            'periode_fin'               => '2026-12-31',
            'date_lancement'            => '2026-10-01',
            'date_limite_planification' => '2026-10-15',
            'date_limite_entretiens'    => '2026-11-15',
            'date_limite_transmission'  => '2026-11-30',
            'date_limite_synthese'      => '2026-12-15',
            'date_cloture'              => '2026-12-31',
            'cree_par'                  => 1,
            'lance_par'                 => 1,
            'lance_at'                  => '2026-07-14 08:00:00',
        ]);

        // Répartition réaliste des statuts pour 2026
        $distribution = [
            'a_planifier'       => 18,
            'planifiee'         => 20,
            'en_cours'          => 20,
            'signee_evaluateur' => 12,
            'signee_agent'      => 10,
            'transmise_daf'     => 12,
            'annotee_dg'        => 8,
            'notifiee'          => 8,
            'archivee'          => 7,
        ];

        $empList    = $employees->shuffle();
        $empIndex   = 0;

        foreach ($distribution as $statut => $count) {
            for ($i = 0; $i < $count && $empIndex < $empList->count(); $i++, $empIndex++) {
                $emp        = $empList[$empIndex];
                $profilKey  = $this->randomProfil();
                $statAgent  = $this->statutAgent($emp);
                $direction  = $this->directions[array_rand($this->directions)];
                $anciennete = $emp->hire_date ? (int) Carbon::parse($emp->hire_date)->diffInMonths(now()) : 24;

                $ficheData = [
                    'campagne_id'             => $camp2026->id,
                    'employee_id'             => $emp->id,
                    'evaluateur_id'           => $userIds[array_rand($userIds)],
                    'statut'                  => $statut,
                    'statut_agent'            => $statAgent,
                    'snapshot_matricule'      => $emp->employee_number,
                    'snapshot_fonction'       => $emp->fonction ?? $this->fonctions[array_rand($this->fonctions)],
                    'snapshot_direction'      => $direction,
                    'snapshot_service'        => 'Service ' . chr(rand(65, 70)),
                    'snapshot_superieur'      => 'M. ' . ['DIALLO', 'FALL', 'NDIAYE', 'SECK'][array_rand(['DIALLO', 'FALL', 'NDIAYE', 'SECK'])],
                    'snapshot_anciennete_mois'=> $anciennete,
                ];

                // Enrichissement progressif selon le statut
                if (in_array($statut, ['planifiee','en_cours','signee_evaluateur','signee_agent','transmise_daf','annotee_dg','notifiee','archivee'])) {
                    $ficheData['date_entretien'] = '2026-11-' . str_pad(rand(3, 28), 2, '0', STR_PAD_LEFT);
                    $ficheData['lieu_entretien'] = ['Salle de conférence ANASER', 'Bureau du DRH', 'Salle A - Siège ANASER'][rand(0, 2)];
                }

                if (in_array($statut, ['en_cours','signee_evaluateur','signee_agent','transmise_daf','annotee_dg','notifiee','archivee'])) {
                    $ficheData['entretien_tenu']        = true;
                    $ficheData['entretien_tenu_at']     = '2026-11-10 10:00:00';
                    $ficheData['realisations']          = $this->realisations[array_rand($this->realisations)];
                    $ficheData['difficultes']           = $this->difficultes[array_rand($this->difficultes)];
                    $ficheData['competences_demontrees']= 'Maîtrise technique, sens de l\'initiative, travail en équipe, respect des délais.';
                    $ficheData['observations_evaluateur'] = 'Agent appliqué et rigoureux. Continue à progresser dans son domaine.';
                }

                if (in_array($statut, ['signee_evaluateur','signee_agent','transmise_daf','annotee_dg','notifiee','archivee'])) {
                    $ficheData['signe_evaluateur_at'] = '2026-11-15 14:00:00';
                }

                if (in_array($statut, ['signee_agent','transmise_daf','annotee_dg','notifiee','archivee'])) {
                    $ficheData['signe_agent_at']     = '2026-11-16 09:00:00';
                    $ficheData['observations_agent'] = 'J\'ai pris connaissance de mon évaluation et m\'engage à atteindre les objectifs fixés.';
                }

                if (in_array($statut, ['transmise_daf','annotee_dg','notifiee','archivee'])) {
                    $ficheData['transmise_daf_at'] = '2026-11-20 08:00:00';
                    $ficheData['daf_user_id']      = 2;
                }

                if (in_array($statut, ['annotee_dg','notifiee','archivee'])) {
                    $ficheData['avis_dg']    = 'Évaluation validée. Décisions prises en accord avec les recommandations.';
                    $ficheData['dg_user_id'] = 1;
                }

                if (in_array($statut, ['notifiee','archivee'])) {
                    $ficheData['notifiee_at'] = '2026-12-01 10:00:00';
                }

                if ($statut === 'archivee') {
                    $ficheData['archivee_at'] = '2026-12-15 16:00:00';
                }

                $fiche = EvalFiche::create($ficheData);

                // Notations si entretien tenu
                if ($ficheData['entretien_tenu'] ?? false) {
                    $this->insererNotations($fiche, $baseCrit, $compCrit, $statAgent === 'fonctionnaire' ? $fonctCrit : collect(), $profilKey);
                    $fiche->recalculerMoyenne();
                    $this->insererBesoins($fiche, rand(1, 3));
                    $this->insererObjectifs($fiche, rand(1, 3));
                }

                if (in_array($statut, ['annotee_dg','notifiee','archivee'])) {
                    $this->insererDecision($fiche, 1, $profilKey);
                }

                // Audit trail
                EvalAudit::create([
                    'user_id'     => $userIds[array_rand($userIds)],
                    'action'      => 'fiche.' . $statut,
                    'entite_type' => 'EvalFiche',
                    'entite_id'   => $fiche->id,
                    'meta'        => ['demo' => true],
                ]);
            }
        }

        $this->command->info('✅ EvalDemoSeeder : campagne 2025 (20 fiches archivées) + campagne 2026 (115 fiches, tous statuts)');
    }

    private function insererNotations(EvalFiche $fiche, $baseCrit, $compCrit, $fonctCrit, string $profilKey): void
    {
        $notes = $this->profils[$profilKey];
        $allCrit = $baseCrit->merge($compCrit)->merge($fonctCrit)->values();

        foreach ($allCrit as $idx => $critere) {
            $note = $notes[$idx % count($notes)] + rand(-1, 1);
            $note = max(1, min(5, $note));

            EvalNotation::create([
                'fiche_id'    => $fiche->id,
                'critere_id'  => $critere->id,
                'note'        => $note,
                'observation' => $note <= 3
                    ? 'Des efforts sont à consentir pour améliorer ce point.'
                    : ($note === 5 ? 'Excellent niveau maîtrisé.' : null),
            ]);
        }
    }

    private function insererBesoins(EvalFiche $fiche, int $count): void
    {
        $selection = collect($this->besoinsFormation)->shuffle()->take($count);
        foreach ($selection as $i => $b) {
            EvalBesoinFormation::create([
                'fiche_id' => $fiche->id,
                'intitule' => $b['intitule'],
                'priorite' => $b['priorite'],
                'ordre'    => $i,
            ]);
        }
    }

    private function insererObjectifs(EvalFiche $fiche, int $count): void
    {
        $selection = collect($this->objectifs)->shuffle()->take($count);
        foreach ($selection as $i => $o) {
            EvalObjectif::create([
                'fiche_id'   => $fiche->id,
                'objectif'   => $o['objectif'],
                'indicateur' => $o['indicateur'],
                'echeance'   => $o['echeance'],
                'ordre'      => $i,
            ]);
        }
    }

    private function insererDecision(EvalFiche $fiche, int $userId, string $profilKey): void
    {
        EvalDecisionRh::create([
            'fiche_id'          => $fiche->id,
            'formation'         => in_array($profilKey, ['satisfaisant', 'a_ameliorer', 'insuffisant']),
            'coaching'          => $profilKey === 'insuffisant',
            'mobilite'          => false,
            'felicitations'     => in_array($profilKey, ['excellent', 'tres_satisfaisant']),
            'suivi_particulier' => $profilKey === 'insuffisant',
            'gratification'     => $profilKey === 'excellent',
            'montant_gratification' => $profilKey === 'excellent' ? '150 000 FCFA' : null,
            'autre'             => null,
            'commentaire'       => match ($profilKey) {
                'excellent'         => 'Agent exemplaire. Gratification accordée.',
                'tres_satisfaisant' => 'Très bonne performance. Félicitations.',
                'satisfaisant'      => 'Performance satisfaisante. Maintenir l\'effort.',
                'a_ameliorer'       => 'Des progrès sont attendus. Formation recommandée.',
                'insuffisant'       => 'Performances insuffisantes. Plan de coaching obligatoire.',
            },
            'decideur_id' => $userId,
            'decide_at'   => now(),
        ]);
    }

    private function randomProfil(): string
    {
        // Distribution réaliste ANASER
        $rand = rand(1, 100);
        return match (true) {
            $rand <= 10 => 'excellent',
            $rand <= 40 => 'tres_satisfaisant',
            $rand <= 70 => 'satisfaisant',
            $rand <= 88 => 'a_ameliorer',
            default     => 'insuffisant',
        };
    }

    private function statutAgent(Employee $emp): string
    {
        $cat = strtolower($emp->categorie_emploi ?? '');
        if (str_contains($cat, 'fonctionnaire') || str_contains($cat, 'détach')) return 'fonctionnaire';
        if (str_contains($cat, 'décision') || str_contains($cat, 'decisionnaire')) return 'decisionnaire';
        return 'contractuel';
    }
}
