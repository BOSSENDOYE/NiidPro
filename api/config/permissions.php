<?php

/**
 * Catalogue centralisé des permissions de l'application.
 *
 * Structure : tableau de modules, chacun avec :
 *   - label    : nom affiché en français
 *   - icon     : icône Material (utilisé côté front)
 *   - perms    : [ 'clé.action' => 'Libellé français' ]
 *
 * Pour ajouter un nouveau module, il suffit d'ajouter un bloc ici
 * puis de relancer le seeder (php artisan db:seed --class=PermissionSeeder).
 * Le frontend récupère cette liste via l'API et l'affiche automatiquement.
 */

return [

    [
        'label' => 'Tableau de bord',
        'icon'  => 'dashboard',
        'perms' => [
            'dashboard.voir' => 'Voir le tableau de bord',
        ],
    ],

    [
        'label' => 'Employés',
        'icon'  => 'people',
        'perms' => [
            'employes.voir'      => 'Voir les employés',
            'employes.creer'     => 'Ajouter un employé',
            'employes.modifier'  => 'Modifier un employé',
            'employes.supprimer' => 'Supprimer un employé',
        ],
    ],

    [
        'label' => 'Contrats',
        'icon'  => 'description',
        'perms' => [
            'contrats.voir'     => 'Voir les contrats',
            'contrats.creer'    => 'Créer un contrat',
            'contrats.modifier' => 'Modifier un contrat',
        ],
    ],

    [
        'label' => 'Pointage',
        'icon'  => 'fingerprint',
        'perms' => [
            'pointage.voir'  => 'Voir les pointages',
            'pointage.gerer' => 'Gérer les pointages',
        ],
    ],

    [
        'label' => 'Congés',
        'icon'  => 'beach_access',
        'perms' => [
            'conges.voir'     => 'Voir les demandes de congé',
            'conges.creer'    => 'Soumettre une demande de congé',
            'conges.approuver'=> 'Approuver / Refuser un congé',
        ],
    ],

    [
        'label' => 'Bulletins de paie',
        'icon'  => 'receipt_long',
        'perms' => [
            'bulletins.voir'  => 'Voir les bulletins de paie',
            'bulletins.gerer' => 'Générer / gérer les bulletins',
        ],
    ],

    [
        'label' => 'Sanctions',
        'icon'  => 'gavel',
        'perms' => [
            'sanctions.voir'  => 'Voir les sanctions',
            'sanctions.gerer' => 'Gérer les sanctions',
        ],
    ],

    [
        'label' => 'Tâches',
        'icon'  => 'task_alt',
        'perms' => [
            'taches.voir'  => 'Voir les tâches',
            'taches.gerer' => 'Créer et gérer les tâches',
        ],
    ],

    [
        'label' => 'Documents',
        'icon'  => 'folder_open',
        'perms' => [
            'documents.voir'  => 'Voir les documents',
            'documents.gerer' => 'Générer des documents officiels',
        ],
    ],

    [
        'label' => 'Formations',
        'icon'  => 'school',
        'perms' => [
            'formations.voir'     => 'Voir les formations',
            'formations.creer'    => 'Créer une demande de formation',
            'formations.approuver'=> 'Approuver / planifier une formation',
            'formations.gerer'    => 'Administrer les formations (sessions, évaluations)',
        ],
    ],

    [
        'label' => 'Plan de formation',
        'icon'  => 'menu_book',
        'perms' => [
            'plan_formation.voir'  => 'Voir le plan de formation',
            'plan_formation.gerer' => 'Élaborer / modifier le plan de formation',
        ],
    ],

    [
        'label' => 'Recrutement',
        'icon'  => 'person_search',
        'perms' => [
            'recrutement.voir'     => 'Voir les recrutements',
            'recrutement.creer'    => 'Soumettre une demande de recrutement',
            'recrutement.approuver'=> 'Approuver / rejeter une demande',
            'recrutement.gerer'    => 'Gérer les candidatures et entretiens',
        ],
    ],

    [
        'label' => 'Plan de recrutement',
        'icon'  => 'account_tree',
        'perms' => [
            'plan_recrutement.voir'  => 'Voir le plan de recrutement',
            'plan_recrutement.gerer' => 'Élaborer / modifier le plan de recrutement',
        ],
    ],

    [
        'label' => 'Évaluations',
        'icon'  => 'star_rate',
        'perms' => [
            'evaluations.voir'   => 'Voir les évaluations',
            'evaluations.creer'  => 'Créer une évaluation',
            'evaluations.gerer'  => 'Administrer les évaluations (notes, validation)',
        ],
    ],

    [
        'label' => 'Carrières',
        'icon'  => 'workspace_premium',
        'perms' => [
            'carrieres.voir'       => 'Consulter les dossiers de carrière',
            'carrieres.evaluer'    => 'Conduire les évaluations annuelles',
            'carrieres.avancement' => 'Valider les avancements à l\'ancienneté',
            'carrieres.promotion'  => 'Gérer les promotions et la commission',
            'carrieres.pdi'        => 'Gérer les plans de développement individuel',
            'carrieres.mobilite'   => 'Traiter les demandes de mobilité interne',
        ],
    ],

    [
        'label' => 'Rapports',
        'icon'  => 'bar_chart',
        'perms' => [
            'rapports.voir' => 'Consulter les rapports et statistiques',
        ],
    ],

    [
        'label' => 'Administration',
        'icon'  => 'admin_panel_settings',
        'perms' => [
            'utilisateurs.gerer' => 'Gérer les utilisateurs et profils',
            'parametres.gerer'   => 'Modifier les paramètres de l\'application',
        ],
    ],

];
