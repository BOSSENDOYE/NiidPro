**DstComputing**

*Ingénierie logicielle & solutions métier*

**CAHIER DES CHARGES FONCTIONNEL**

**Module « Gestion des Évaluations du Personnel »**

Plateforme NiidPro --- SIRH

Client : Agence Nationale de la Sécurité Routière (ANASER)

*Document de référence : Note de cadrage --- Campagne d\'évaluation
annuelle du personnel, Exercice 2026*

*Fondement : Manuel de procédures ANASER (Version 01 -- août 2023),
Chapitre IV, Sections B et 11*

Version 1.0 --- Août 2026

Sommaire

1\. Contexte et objet du document

2\. Objectifs du module

3\. Périmètre fonctionnel et exclusions

4\. Référentiels et paramétrage préalable

5\. Acteurs, rôles et droits d\'accès

6\. Cycle de vie de la fiche d\'évaluation

7\. Spécifications fonctionnelles détaillées par sous-procédure

7.1. Sous-procédure 1 --- Lancer la campagne d\'évaluation

7.2. Sous-procédure 2 --- Planifier les entretiens d\'évaluation

7.3. Sous-procédure 3 --- Évaluer et transmettre

7.4. Sous-procédure 4 --- Élaboration du tableau de synthèse

7.5. Sous-procédure 5 --- Étudier les rapports, notifier et transmettre

7.6. Sous-procédure 6 --- Informer les agents

8\. Cas particuliers et règles de gestion transverses

9\. Confidentialité, archivage et traçabilité

10\. Notifications et tableau de bord

11\. Documents générés par le système

12\. Matrice RACI

13\. Exigences non fonctionnelles

14\. Liste des écrans du module

15\. Glossaire

1\. Contexte et objet du document

L\'Agence Nationale de la Sécurité Routière (ANASER) organise chaque
année, conformément au Manuel de procédures (Version 01 -- août 2023,
Chapitre IV, Section B et Section 11), une campagne d\'évaluation
professionnelle de l\'ensemble de son personnel. Cette campagne repose
sur un entretien annuel entre chaque collaborateur et son responsable
hiérarchique, portant sur les responsabilités tenues, les compétences,
l\'atteinte du plan d\'action de la période écoulée, la fixation des
objectifs à venir, les besoins de formation et les perspectives
d\'évolution.

La Note de cadrage --- Campagne d\'évaluation annuelle du personnel,
Exercice 2026 formalise les modalités d\'organisation de cette campagne
et sert de cahier des charges métier de référence pour le présent
document.

Le présent cahier des charges fonctionnel a pour objet de traduire
intégralement cette note de cadrage --- son contexte, ses six
sous-procédures, ses acteurs, ses critères et son calendrier --- en un
ensemble de fonctionnalités à développer dans un nouveau module «
Gestion des Évaluations » intégré à la plateforme NiidPro (SIRH
développée par DstComputing, Laravel 11 / React 18 -- TypeScript).
Aucune étape, tâche, acteur ou règle de gestion mentionnée dans la note
de cadrage n\'est volontairement omise ; chaque élément de la note est
repris et décliné en exigence fonctionnelle correspondante.

Le module doit permettre une application uniforme de la procédure
décrite, tout en restant paramétrable (dates, structures, critères) pour
être reconductible d\'une campagne à l\'autre et adaptable à d\'autres
clients NiidPro ayant des procédures similaires.

2\. Objectifs du module

Conformément à l\'article « Objectifs de la campagne » de la note de
cadrage (Manuel, page 99), le module doit permettre au système
d\'information de servir directement les objectifs suivants :

-   Permettre d\'apprécier objectivement et de manière transparente les
    performances individuelles de chaque agent, via une grille de
    notation structurée et traçable ;

-   Permettre de mesurer et documenter le niveau d\'atteinte du plan
    d\'action personnel de la période écoulée ;

-   Permettre d\'identifier et de consolider les besoins en formation et
    en renforcement de capacités, en vue d\'alimenter un futur plan de
    formation ;

-   Permettre de fixer et d\'enregistrer les objectifs et le plan
    d\'action de la période à venir ;

-   Permettre de documenter les possibilités d\'évolution
    professionnelle envisagées ;

-   Garantir que chaque agent soit informé, de manière tracée, du
    résultat de son évaluation ;

-   Fournir à la Direction générale, au DAF et à la Division RH une
    visibilité en temps réel sur l\'avancement de la campagne (structure
    par structure, agent par agent) ;

-   Sécuriser et automatiser la circulation des documents (notes de
    service, fiches, tableaux de synthèse, courriers de notification)
    entre les différents acteurs du circuit.

Le module rappelle et fait respecter, à chaque étape, le principe fixé
par la note de cadrage selon lequel l\'évaluation ne revêt aucun
caractère disciplinaire et doit être conduite dans le respect de la
dignité de chaque agent --- ce principe est affiché en en-tête de chaque
fiche d\'évaluation et ne peut être désactivé par paramétrage.

3\. Périmètre fonctionnel et exclusions

3.1. Personnel concerné

Conformément au Manuel de procédures (Section B, page 67), le module
doit couvrir la totalité du périmètre humain suivant, chaque catégorie
devant être identifiable dans la fiche agent existante de NiidPro
(attribut « Catégorie statutaire ») :

-   Les agents recrutés directement par l\'Agence (contractuels) ;

-   Les fonctionnaires et agents non fonctionnaires mis à la disposition
    de l\'ANASER par l\'État ;

-   Les agents décisionnaires ;

-   Les chefs de service et responsables hiérarchiques, qui sont
    eux-mêmes évalués --- cas particulier --- par le Directeur général,
    appuyé par le Secrétaire général (cf. § 8.1).

Règle de gestion --- double évaluation : le système doit permettre de
signaler, pour les agents relevant de la Fonction publique mis à
disposition, qu\'ils sont soumis à une notation statutaire
complémentaire gérée hors du système (procédures de la Fonction
publique). Le module doit simplement permettre d\'enregistrer une
référence/pièce jointe à cette notation externe dans le dossier de
l\'agent, sans en piloter le circuit.

3.2. Périmètre fonctionnel couvert

-   Paramétrage de campagne annuelle et des référentiels (critères,
    calendrier, structures) ;

-   Lancement de campagne et génération de la note de service ;

-   Diffusion et suivi des fiches d\'évaluation aux responsables
    hiérarchiques selon l\'organigramme ;

-   Planification des entretiens ;

-   Saisie de la notation, des commentaires, du plan d\'action et double
    signature électronique ;

-   Transmission, consolidation et synthèse des évaluations par
    structure ;

-   Étude, annotation (dont décision de gratification) et validation par
    la Direction générale ;

-   Notification individuelle des résultats aux agents ;

-   Archivage, confidentialité et traçabilité de l\'ensemble du dossier
    d\'évaluation ;

-   Tableaux de bord de suivi d\'avancement, à tout moment de la
    campagne, pour chaque acteur selon son rôle.

3.3. Hors périmètre (exclusions explicites)

Conformément à la note de cadrage (« Toute disposition non prévue par le
Manuel a été écartée »), sont explicitement hors périmètre du module :

-   La notation statutaire de la Fonction publique (gérée par la
    Direction générale de la Fonction publique, hors NiidPro) ;

-   Toute procédure disciplinaire (l\'évaluation ne doit jamais
    alimenter automatiquement un module disciplinaire) ;

-   Le calcul ou la gestion de la paie liée à une éventuelle
    gratification --- le module se limite à enregistrer la décision de
    gratification prise par le DG ; son exécution relève du module Paie
    de NiidPro, via une interface à définir ultérieurement (cf. § 8.4).

4\. Référentiels et paramétrage préalable

Avant le lancement de toute campagne, l\'administrateur fonctionnel du
module (profil « Administrateur RH ») doit pouvoir paramétrer les
référentiels suivants, réutilisables d\'une campagne à l\'autre :

4.1. Référentiel des critères d\'évaluation

Conformément au Chapitre IV, Section B (page 67) du Manuel, deux jeux de
critères doivent être paramétrés et rattachables conditionnellement au
profil statutaire de l\'agent :

4.1.1. Critères socles (applicables à tout le personnel)

-   Assiduité au travail et conduite

-   Ponctualité

-   Célérité dans l\'accomplissement des tâches

-   Esprit d\'initiative

-   Sens des responsabilités

-   Relations humaines

-   Engagement dans les projets, programmes et activités de l\'ANASER

4.1.2. Critères complémentaires (agents mis à disposition par l\'État)

-   Conscience professionnelle

-   Bonne conduite

-   Respect du secret professionnel

-   Tâches dévolues à l\'agent

-   Sens de l\'engagement

-   Respect de l\'autorité et de la hiérarchie

Règle de gestion : le système doit déterminer automatiquement, à la
génération de la fiche, si les critères complémentaires s\'appliquent,
sur la base du champ « Catégorie statutaire = Mis à disposition par
l\'État / Fonction publique » de la fiche agent. Chaque critère est noté
sur une échelle paramétrable (par défaut 1 à 5, avec libellés) et
assorti d\'une zone de commentaire libre. Le référentiel de critères est
verrouillé (non modifiable) dès qu\'une campagne utilisant ce
référentiel est lancée, afin de garantir l\'homogénéité des évaluations
d\'une même campagne ; toute modification donne lieu à une nouvelle
version du référentiel, applicable aux campagnes futures uniquement.

4.2. Référentiel des structures / organigramme

Le module s\'appuie sur l\'organigramme déjà présent dans NiidPro
(structures, services, postes, liens hiérarchiques N+1) pour déterminer
automatiquement, pour chaque agent, son responsable hiérarchique
évaluateur. Le module doit permettre de vérifier, avant le lancement de
la campagne, l\'exhaustivité de ce rattachement (aucun agent actif sans
responsable hiérarchique désigné) et de générer un rapport des anomalies
à corriger avant lancement.

4.3. Référentiel du calendrier de campagne

Conformément à l\'article « Calendrier de la campagne » de la note de
cadrage, aucune échéance chiffrée n\'est imposée par le Manuel ; seule
la clôture avant la fin de l\'exercice est une contrainte absolue. Le
module doit donc permettre, à chaque campagne, de définir librement
(avec les valeurs indicatives 2026 pré-remplies à titre d\'exemple) les
périodes cibles suivantes, chacune associée à une sous-procédure :

  ---------------------------------------------------------------------------
  **N°**   **Sous-procédure**            **Acteur(s)**      **Période
                                                            indicative 2026**
  -------- ----------------------------- ------------------ -----------------
  1        Lancement de la campagne      DG / SG            Octobre 2026
           (note de service + diffusion                     
           des fiches)                                      

  2        Planification des entretiens  Responsables       Octobre 2026
           par les responsables          hiérarchiques      
           hiérarchiques                                    

  3        Conduite des entretiens et    Responsables       Novembre 2026
           notation en présence de       hiérarchiques      
           l\'évalué                                        

  4        Transmission des fiches au    DAF / Division RH  Novembre 2026
           DAF / Division RH et                             
           élaboration du tableau de                        
           synthèse                                         

  5        Examen du rapport de synthèse DG / SG            Décembre 2026
           et décision du DG                                

  6        Notification des résultats    DAF                Décembre 2026
           aux agents                                       
  ---------------------------------------------------------------------------

Le module doit alerter automatiquement (tableau de bord + notification)
si la date de clôture paramétrée de la campagne (fin d\'exercice) risque
de ne pas être respectée compte tenu du taux d\'avancement constaté.

5\. Acteurs, rôles et droits d\'accès

Conformément au tableau des acteurs et responsabilités de la note de
cadrage (Manuel, page 100), le module doit définir les profils
applicatifs suivants, avec les droits d\'accès associés (principe du
moindre privilège) :

  ------------------------------------------------------------------------
  **Rôle           **Correspondance     **Droits principaux**
  applicatif**     métier**             
  ---------------- -------------------- ----------------------------------
  Administrateur   Division des         Paramétrer critères, calendrier,
  RH               Ressources humaines  structures ; créer une campagne ;
                   (paramétrage)        consulter tous les tableaux de
                                        bord

  Directeur        Directeur général    Lancer la campagne, signer la note
  Général (DG)                          de service, consulter/annoter le
                                        rapport de synthèse, décider des
                                        gratifications, valider la
                                        transmission pour notification

  Secrétaire       Secrétaire général   Appuyer le DG (fixation période
  Général (SG)                          annuelle, co-consultation des
                                        rapports de synthèse, co-décision)

  Responsable      Chef de service /    Planifier les entretiens de ses
  hiérarchique     N+1                  collaborateurs directs, saisir la
                                        notation, signer, transmettre au
                                        DAF, consulter l\'historique des
                                        évaluations qu\'il a menées

  Directeur        DAF                  Réceptionner les fiches,
  Administratif et                      superviser l\'élaboration du
  Financier (DAF)                       tableau de synthèse, transmettre
                                        au DG, établir et signer les
                                        courriers de notification, gérer
                                        l\'archivage officiel

  Gestionnaire RH  Division des         Assister le DAF dans
                   Ressources humaines  l\'élaboration du tableau de
                   (appui)              synthèse (accès en contribution,
                                        sans droit de validation finale)

  Agent évalué     Collaborateur        Consulter ses convocations
                                        d\'entretien, consulter et donner
                                        son accord de signature sur sa
                                        propre fiche, consulter le
                                        résultat notifié de son évaluation
  ------------------------------------------------------------------------

Règle de gestion --- cas des responsables hiérarchiques évalués : un
responsable hiérarchique, en tant qu\'agent, est lui-même évalué. Le
système doit donc permettre à un même utilisateur de cumuler le rôle «
Responsable hiérarchique » (pour ses subordonnés) et le rôle « Agent
évalué » (pour sa propre fiche), sans confusion d\'écran ni de circuit
(cf. § 8.1).

6\. Cycle de vie de la fiche d\'évaluation

Chaque fiche d\'évaluation individuelle suit un cycle de vie strict,
matérialisé par un statut visible à tout moment par les acteurs
habilités. Le passage d\'un statut à l\'autre déclenche systématiquement
une notification aux acteurs concernés (cf. § 10).

  ----------------------------------------------------------------------------------
  **\#**   **Statut de la fiche**     **Déclenché par**         **Sous-procédure**
  -------- -------------------------- ------------------------- --------------------
  1        Créée (générée             Lancement de campagne     SP1
           automatiquement)           (DG/SG)                   

  2        Transmise au responsable   Diffusion automatique     SP1
           hiérarchique               selon organigramme        

  3        Entretien planifié         Responsable hiérarchique  SP2

  4        Agent informé de la        Notification automatique  SP2
           convocation                                          

  5        En cours de notation       Responsable hiérarchique  SP3
                                      (pendant l\'entretien)    

  6        Notée --- en attente de    Responsable hiérarchique  SP3
           discussion                                           

  7        En attente d\'accord de    Responsable hiérarchique  SP3
           signature de l\'agent                                

  8        Signée (responsable +      Agent + Responsable       SP3
           agent)                     hiérarchique              

  9        Transmise au DAF           Responsable hiérarchique  SP3

  10       Réceptionnée par le DAF /  DAF                       SP4
           Division RH                                          

  11       Intégrée au tableau de     DAF / Division RH         SP4
           synthèse                                             

  12       Tableau transmis au DG     DAF                       SP4

  13       Étudiée par le DG/SG       DG / SG                   SP5

  14       Annotée / gratification    DG                        SP5
           décidée                                              

  15       Validée pour notification  DG                        SP5

  16       Courrier de notification   DAF                       SP6
           établi                                               

  17       Notifiée à l\'agent        DAF                       SP6

  18       Archivée                   Système (automatique)     Transverse
  ----------------------------------------------------------------------------------

Cas d\'exception gérés par le workflow

-   Refus de signature de l\'agent : statut « Signature refusée ---
    commentaire agent requis » ; la fiche reste bloquée tant que le
    responsable hiérarchique n\'a pas consigné les motifs et proposé une
    relance d\'entretien, conformément au principe de dignité rappelé au
    § 2 ;

-   Agent absent/indisponible durablement (congé, maladie, mission) :
    statut « Entretien reporté », avec motif et nouvelle date
    obligatoire, sans clôturer la fiche ;

-   Agent quittant l\'ANASER en cours de campagne : statut « Clôturée
    sans notation --- sortie d\'effectif », tracé mais exclu du tableau
    de synthèse ;

-   Nouvelle recrue en cours d\'année n\'ayant pas de fiche d\'objectifs
    antérieure : le module autorise la saisie directe des objectifs de
    la fiche d\'embauche comme référence, conformément au Manuel («
    fiche d\'objectifs annuels, ou établie lors de l\'embauche »).

7\. Spécifications fonctionnelles détaillées par sous-procédure

7.1. Sous-procédure 1 --- Lancer la campagne d\'évaluation
professionnelle

**Acteur(s) :** Directeur général, appuyé par le Secrétaire général.

**Déclencheur :** Période annuelle des entretiens décidée par le
Secrétaire général.

**Support(s) documentaire(s) :** Note de service ; Fiches d\'évaluation.

Tâches métier à couvrir (rappel intégral de la note de cadrage)

> 1\. Établir et signer la note de service annonçant l\'évaluation des
> agents de l\'année en cours.
>
> 2\. Remplir et transmettre aux différents responsables hiérarchiques
> les fiches d\'évaluation des collaborateurs qui sont sous leur
> supervision.

Fonctionnalités système à développer

-   Écran « Créer une campagne » : saisie de l\'année d\'exercice, du
    référentiel de critères applicable (version verrouillée), du
    calendrier indicatif par sous-procédure, et du périmètre d\'agents
    concernés (par défaut : tous les agents actifs, avec possibilité
    d\'exclusion motivée) ;

-   Génération automatique, à partir d\'un modèle paramétrable (en-tête
    République du Sénégal / ANASER, texte réglementaire pré-rempli), du
    projet de note de service annonçant la campagne ;

-   Circuit de validation électronique de la note de service par le
    Directeur général (signature électronique ou import de la version
    scannée signée) avant diffusion officielle ;

-   Génération automatique, dès la note de service validée, d\'une fiche
    d\'évaluation vierge par agent actif du périmètre, pré-remplie avec
    : identité, poste, structure, ancienneté, responsable hiérarchique
    (déduit de l\'organigramme), critères applicables (socles +
    complémentaires si agent mis à disposition), et rappel du plan
    d\'action de la période précédente le cas échéant ;

-   Transmission automatique de chaque fiche générée au responsable
    hiérarchique concerné, avec regroupement par responsable de la liste
    de ses collaborateurs à évaluer ;

-   Passage automatique du statut de campagne de « Brouillon » à «
    Lancée », déclenchant le démarrage de la sous-procédure 2 pour tous
    les responsables hiérarchiques concernés ;

-   Contrôle bloquant : la campagne ne peut être lancée si le rapport
    d\'anomalies d\'organigramme (§ 4.2) n\'a pas été traité, ou si
    aucun référentiel de critères n\'est associé.

Écrans / interfaces associés

-   Écran « Paramétrage de campagne » (Administrateur RH) ;

-   Écran « Validation et signature de la note de service » (DG) ;

-   Écran « Suivi de diffusion des fiches » (DG/SG/DAF/Division RH) ---
    statistiques en temps réel du nombre de fiches transmises par
    structure.

Règles de gestion spécifiques

-   Une seule campagne active à la fois par exercice ; une nouvelle
    campagne ne peut être créée pour un exercice déjà couvert par une
    campagne non clôturée ;

-   La liste des agents et leur rattachement hiérarchique est figée («
    photographiée ») au moment du lancement, pour garantir la cohérence
    de la campagne même en cas de mouvement de personnel ultérieur
    (mutation gérée en exception, cf. § 6 « Cas d\'exception »).

7.2. Sous-procédure 2 --- Planifier les entretiens d\'évaluation

**Acteur(s) :** Responsable hiérarchique.

**Déclencheur :** Période annuelle des entretiens décidée par le
Secrétaire général.

**Support(s) documentaire(s) :** Courriel / notification d\'information
au collaborateur.

Tâches métier à couvrir (rappel intégral de la note de cadrage)

> 1\. Planifier les entretiens : fixer la date, l\'heure et le lieu.
>
> 2\. Informer les collaborateurs devant être reçus.

Fonctionnalités système à développer

-   Écran « Mes évaluations à planifier » listant, pour le responsable
    hiérarchique connecté, l\'ensemble des fiches à son statut «
    Transmise au responsable hiérarchique », avec filtre par service et
    par statut de planification ;

-   Formulaire de planification par agent : date, heure, lieu
    (présentiel/salle ou visioconférence), durée prévue ; possibilité de
    planification en lot (sélection multiple d\'agents avec créneaux
    successifs) ;

-   Génération et envoi automatique d\'une notification (courriel +
    notification in-app) à l\'agent concerné, l\'informant de la date,
    l\'heure et le lieu de son entretien, avec accusé de réception de
    consultation ;

-   Possibilité de replanification avec motif obligatoire (traçabilité)
    et notification automatique de la nouvelle date ;

-   Tableau de bord du responsable hiérarchique indiquant, en temps
    réel, le nombre d\'entretiens planifiés / restant à planifier parmi
    ses collaborateurs ;

-   Relance automatique (notification) du responsable hiérarchique si
    des entretiens restent non planifiés à l\'approche de la date de fin
    prévue pour la sous-procédure 2 (paramétrée en § 4.3).

Écrans / interfaces associés

-   Écran « Mes évaluations à planifier » (Responsable hiérarchique) ;

-   Écran « Mes convocations » (Agent évalué) ;

-   Vue calendrier des entretiens (Responsable hiérarchique).

Règles de gestion spécifiques

-   Le passage au statut « Entretien planifié » ne peut se faire sans
    date, heure et lieu renseignés ;

-   Le module doit vérifier l\'absence de conflit d\'agenda pour le
    responsable hiérarchique (chevauchement d\'entretiens) et alerter
    sans bloquer.

7.3. Sous-procédure 3 --- Évaluer et transmettre

**Acteur(s) :** Responsable hiérarchique.

**Déclencheur :** Date de l\'entretien ; fiche d\'objectifs annuels (ou
établie lors de l\'embauche).

**Support(s) documentaire(s) :** Fiche d\'évaluation.

Tâches métier à couvrir (rappel intégral de la note de cadrage)

> 1\. Préparer le déroulement de l\'entretien.
>
> 2\. S\'entretenir avec le collaborateur à évaluer.
>
> 3\. Effectuer la notation en présence de l\'évalué.
>
> 4\. Discuter de l\'évaluation avec le collaborateur évalué.
>
> 5\. Signer la fiche d\'évaluation.
>
> 6\. Faire signer la fiche d\'évaluation au collaborateur après accord
> de ce dernier.
>
> 7\. Fixer les objectifs pour la période à venir.
>
> 8\. Transmettre l\'original de la fiche d\'évaluation au Directeur
> Administratif et Financier et conserver une copie.

Fonctionnalités système à développer

-   Écran « Préparer l\'entretien » : rappel automatique, en lecture, du
    plan d\'action de la période précédente et de son niveau d\'atteinte
    antérieur, du poste occupé, et de l\'historique des évaluations
    précédentes de l\'agent (si disponibles) ;

-   Formulaire de notation structuré par critère du référentiel
    applicable (socles, + complémentaires si agent mis à disposition),
    avec échelle de notation paramétrée et zone de commentaire libre
    obligatoire par critère noté en dessous d\'un seuil paramétrable ;

-   Bloc « Bilan du plan d\'action de la période écoulée » : reprise de
    chaque objectif fixé l\'année précédente avec évaluation du niveau
    d\'atteinte (échelle qualitative) et commentaire ;

-   Bloc « Besoins en formation et renforcement de capacités » : saisie
    libre + sélection dans un référentiel de thématiques de formation
    (alimentant un futur module Plan de formation) ;

-   Bloc « Objectifs et plan d\'action pour la période à venir » : liste
    d\'objectifs SMART (intitulé, échéance, indicateur de suivi) ;

-   Bloc « Perspectives d\'évolution professionnelle envisagées » : zone
    de texte structurée (souhaits de mobilité, de promotion, de
    formation qualifiante) ;

-   Mécanisme de double signature électronique séquentielle : (1) le
    responsable hiérarchique signe en premier après discussion avec
    l\'agent ; (2) le système notifie l\'agent pour recueillir son
    accord explicite avant sa propre signature ; en cas de désaccord,
    bascule vers le cas d\'exception « Signature refusée » (§ 6) ;

-   Génération automatique d\'un PDF horodaté et non modifiable de la
    fiche signée, valant original numérique ;

-   Transmission automatique de l\'original numérique au DAF (file
    d\'attente SP4) dès la double signature obtenue, avec conservation
    d\'une copie en lecture seule dans l\'espace du responsable
    hiérarchique (« Mes évaluations menées ») ;

-   Interdiction technique de modifier une fiche après double signature
    (toute correction nécessite une procédure d\'annulation tracée et
    une re-signature).

Écrans / interfaces associés

-   Écran « Conduite de l\'entretien / Notation » (Responsable
    hiérarchique) --- utilisable en séance, y compris hors connexion
    avec synchronisation différée (mode dégradé) ;

-   Écran « Accord et signature » (Agent évalué) ;

-   Visualiseur de fiche PDF signée (tous acteurs habilités selon
    droits).

Règles de gestion spécifiques

-   La notation ne peut être effectuée qu\'après passage au statut «
    Entretien planifié » (pas de notation « à froid » sans entretien
    tracé), sauf dérogation motivée (ex. entretien tenu en présentiel
    sans connexion, saisie a posteriori avec date réelle de
    l\'entretien) ;

-   Aucun critère ne peut rester non noté à la transmission ;

-   Le principe de non-caractère disciplinaire (§ 2) est rappelé en
    bandeau sur l\'écran de notation.

7.4. Sous-procédure 4 --- Élaboration du tableau de synthèse des
évaluations

**Acteur(s) :** Directeur Administratif et Financier ; Division des
Ressources humaines (en appui).

**Déclencheur :** Fiches d\'évaluation signées.

**Support(s) documentaire(s) :** Tableau de synthèse des évaluations.

Tâches métier à couvrir (rappel intégral de la note de cadrage)

> 1\. Réceptionner les fiches d\'évaluation signées.
>
> 2\. Faire la synthèse des évaluations dans un tableau suivant les
> entités.
>
> 3\. Transmettre le tableau récapitulatif au Directeur général.

Fonctionnalités système à développer

-   File d\'attente « Fiches à réceptionner » (DAF et Division RH en
    consultation/appui) listant les fiches transmises, avec accusé de
    réception formel du DAF (horodaté) qui déclenche la prise en charge
    ;

-   Contrôle automatique de complétude : liste des agents du périmètre
    de campagne sans fiche encore réceptionnée, avec relance possible en
    un clic vers le responsable hiérarchique concerné ;

-   Génération automatique du tableau de synthèse, agrégeant par
    structure/entité : effectif évalué / effectif total, notes moyennes
    par critère, notes individuelles, taux d\'entretiens tenus, synthèse
    des besoins de formation exprimés ;

-   Édition et export du tableau de synthèse aux formats Excel et PDF ;

-   Fonction de contribution collaborative de la Division RH
    (annotations, vérifications) sans droit de validation finale ---
    seul le DAF peut transmettre officiellement le tableau au DG
    (conformément à la note : « la synthèse des évaluations relève du
    DAF ; la Division RH y est associée en tant qu\'appui, sans se
    substituer au DAF ») ;

-   Action « Transmettre au Directeur général » (DAF uniquement),
    figeant une version horodatée du tableau et notifiant le DG/SG.

Écrans / interfaces associés

-   Écran « Réception des fiches » (DAF / Division RH) ;

-   Écran « Tableau de synthèse » avec filtres par structure, statut,
    période (DAF, Division RH, DG en lecture après transmission) ;

-   Export Excel / PDF du tableau de synthèse.

Règles de gestion spécifiques

-   Le tableau de synthèse ne peut être transmis au DG tant que le taux
    de complétude n\'est pas explicitement confirmé par le DAF
    (validation avec état des lieux des fiches manquantes, le cas
    échéant justifiées) ;

-   Toute modification du tableau après transmission au DG génère une
    nouvelle version horodatée, l\'ancienne restant consultable
    (historique).

7.5. Sous-procédure 5 --- Étudier les rapports, notifier et transmettre

**Acteur(s) :** Directeur général, Secrétaire général.

**Déclencheur :** Rapports des évaluations (tableau de synthèse).

**Support(s) documentaire(s) :** Tableau de synthèse annoté.

Tâches métier à couvrir (rappel intégral de la note de cadrage)

> 1\. Prendre connaissance du rapport de synthèse.
>
> 2\. Décider des gratifications.
>
> 3\. Transmettre les informations nécessaires au Directeur
> Administratif et Financier pour notification aux agents.

Fonctionnalités système à développer

-   Écran « Étude du rapport de synthèse » (DG, en co-consultation SG)
    présentant le tableau consolidé avec possibilité de filtrage et de
    zoom sur une fiche individuelle ;

-   Fonction d\'annotation par agent ou par structure (zone de
    commentaire libre du DG) ;

-   Module « Décision de gratification » : pour chaque agent,
    enregistrement d\'une décision parmi une liste paramétrable (ex. :
    prime, lettre de félicitation, proposition de promotion, aucune,
    avertissement écrit --- hors procédure disciplinaire formelle) avec
    commentaire justificatif ;

-   Action « Valider et transmettre au DAF » : fige le tableau annoté («
    tableau de synthèse annoté ») et notifie le DAF, déclenchant la
    sous-procédure 6 ;

-   Interface de préparation d\'une interface de transmission vers le
    module Paie/RH de NiidPro pour les décisions de gratification à
    impact financier (cf. § 8.4), sans automatiser l\'exécution
    financière depuis ce module.

Écrans / interfaces associés

-   Écran « Étude et décision » (DG, avec vue partagée SG) ;

-   Écran « Décisions de gratification » (DG).

Règles de gestion spécifiques

-   Le SG dispose d\'un accès de consultation et de co-annotation, mais
    seule la validation du DG fait foi et déclenche la transmission
    (conformément à « Directeur général, appuyé par le Secrétaire
    général ») ;

-   Une fois validé et transmis, le tableau annoté n\'est plus
    modifiable par le DG (traçabilité de la décision finale).

7.6. Sous-procédure 6 --- Informer les agents

**Acteur(s) :** Directeur Administratif et Financier.

**Déclencheur :** Tableau de synthèse des évaluations annoté.

**Support(s) documentaire(s) :** Courriers de notification.

Tâches métier à couvrir (rappel intégral de la note de cadrage)

> 1\. Établir les courriers de notification aux agents.
>
> 2\. Faire signer les courriers et les transmettre aux agents.

Fonctionnalités système à développer

-   Génération automatique, à partir d\'un modèle paramétrable, d\'un
    courrier de notification individualisé par agent, reprenant a minima
    le résultat global de son évaluation et, si applicable, la décision
    le concernant (hors détails confidentiels non destinés à figurer sur
    le courrier, paramétrables) ;

-   Circuit de signature électronique du DAF sur chaque courrier (ou lot
    de courriers) ;

-   Transmission du courrier à l\'agent par le canal paramétré (portail
    agent NiidPro en libre-service, et/ou courriel, et/ou remise en main
    propre avec émargement scanné) ;

-   Accusé de réception / de consultation par l\'agent, tracé avec
    horodatage ;

-   Passage automatique de la fiche au statut « Notifiée », puis «
    Archivée » après un délai paramétrable ou une action explicite du
    DAF.

Écrans / interfaces associés

-   Écran « Notification des agents » (DAF) --- génération et suivi en
    lot ;

-   Espace « Mon évaluation » (Agent) --- consultation du résultat
    notifié et téléchargement du courrier.

Règles de gestion spécifiques

-   Aucune notification individuelle ne peut être générée avant la
    transmission officielle du tableau annoté par le DG (fin SP5) ;

-   Le module doit permettre de vérifier, en fin de campagne, que 100 %
    des agents évalués ont bien reçu une notification, avec liste
    d\'exceptions justifiées le cas échéant.

8\. Cas particuliers et règles de gestion transverses

8.1. Évaluation des chefs de service et responsables hiérarchiques

Conformément à la note de cadrage, les chefs de service et responsables
hiérarchiques sont eux-mêmes évalués par le Directeur général, appuyé
par le Secrétaire général. Le module doit donc permettre d\'affecter,
pour ce sous-ensemble d\'agents, le rôle d\'évaluateur « Responsable
hiérarchique » de leur fiche au DG (avec SG en appui/co-consultation),
au lieu du rattachement organigramme standard. Cette bascule est
paramétrable par agent au niveau du référentiel structure (§ 4.2), sans
développement spécifique de circuit.

8.2. Centralisation par les chefs de service et avis du Directeur
général

Le Manuel précise que les chefs de service sont chargés de centraliser
les fiches d\'évaluation de leurs équipes et d\'y mentionner leur avis,
et que le Directeur général peut y ajouter des observations lorsqu\'il
s\'agit d\'un cadre. Le module doit donc prévoir : (i) un champ « Avis
du chef de service » distinct du champ de notation par critère,
renseignable au niveau de la fiche globale ; (ii) un champ optionnel «
Observations du Directeur général », visible et modifiable uniquement
par le DG, activable pour les fiches d\'agents ayant le statut « Cadre »
dans leur fiche RH.

8.3. Personnel relevant de la Fonction publique --- double évaluation

Le module rappelle systématiquement, sur la fiche des agents concernés,
l\'existence d\'une notation statutaire parallèle gérée par la Fonction
publique (hors périmètre applicatif), et permet le rattachement d\'un
document justificatif (scan de la notation statutaire) au dossier de
l\'agent à titre d\'archivage complémentaire, sans lien fonctionnel avec
le circuit de la campagne ANASER.

8.4. Interface avec les autres modules NiidPro

-   Module Organigramme / Structures : source du rattachement
    hiérarchique automatique (§ 4.2) ;

-   Module Dossier administratif de l\'agent (GED) : réception de
    l\'original numérique de la fiche signée en fin de campagne (§ 9) ;

-   Module Formation (si existant / à venir) : réception des besoins de
    formation consolidés issus de la sous-procédure 4 ;

-   Module Paie (si existant / à venir) : réception, en lecture, des
    décisions de gratification à impact financier validées en
    sous-procédure 5, pour traitement manuel ou semi-automatisé hors
    périmètre du présent module.

8.5. Multi-campagnes et historique

Le module doit conserver, sans limite de durée, l\'historique de toutes
les campagnes closes et permettre leur consultation en lecture seule
(comparaison d\'une campagne à l\'autre pour un même agent, évolution
des notes par critère dans le temps), utile notamment lors de la
préparation de l\'entretien suivant (§ 7.3).

9\. Confidentialité, archivage et traçabilité

Conformément à l\'article « Confidentialité et archivage » de la note de
cadrage, les fiches d\'évaluation sont des documents administratifs
confidentiels. Le module doit garantir :

-   Un contrôle d\'accès strict basé sur les rôles (§ 5) : un agent ne
    peut consulter que sa propre fiche ; un responsable hiérarchique ne
    peut consulter que les fiches des agents actuellement ou
    historiquement sous sa supervision directe ; le DAF et le DG
    disposent d\'un accès étendu conforme à leurs responsabilités ; la
    Division RH dispose d\'un accès en appui, sans droit de validation ;

-   La conservation de l\'original numérique de la fiche signée dans le
    dossier administratif de l\'agent (module GED / dossier agent
    NiidPro), sous la responsabilité du DAF, conformément au Manuel ;

-   La conservation d\'une copie par le responsable hiérarchique,
    consultable même après un changement d\'affectation de ce dernier
    (historisation du lien évaluateur/évalué au moment de l\'évaluation,
    indépendamment de l\'organigramme courant) ;

-   L\'information de chaque agent du résultat de sa propre évaluation,
    tracée par un accusé de consultation (§ 7.6) ;

-   Une piste d\'audit exhaustive : toute consultation, modification,
    signature ou transmission d\'une fiche est journalisée (utilisateur,
    horodatage, action), consultable par l\'Administrateur RH et le DAF
    à des fins de contrôle ;

-   Le chiffrement au repos des données de notation et des commentaires,
    et le chiffrement en transit (HTTPS) de l\'ensemble des échanges du
    module, en cohérence avec les standards déjà appliqués sur les
    autres modules sensibles de NiidPro (paie, dossiers médicaux) ;

-   Une politique de conservation documentée (durée légale de
    conservation des documents administratifs RH), avec archivage
    automatique (statut « Archivée ») en fin de campagne sans
    possibilité de suppression, seule une purge conforme à la politique
    de conservation étant autorisée, réservée à l\'Administrateur RH
    avec journalisation.

10\. Notifications et tableau de bord

10.1. Notifications événementielles

Le module doit générer une notification (in-app et courriel) à chaque
changement de statut significatif du cycle de vie de la fiche (§ 6), à
destination de l\'acteur devenant responsable de l\'étape suivante et,
le cas échéant, de l\'agent concerné. Les canaux et modèles de messages
sont paramétrables par l\'Administrateur RH.

10.2. Tableaux de bord par rôle

-   Tableau de bord Administrateur RH / DAF / DG : avancement global de
    la campagne par sous-procédure et par structure, alertes sur risques
    de dépassement de calendrier (§ 4.3), taux de complétude ;

-   Tableau de bord Responsable hiérarchique : liste de ses
    collaborateurs avec statut individuel (à planifier / planifié / noté
    / signé / transmis) ;

-   Tableau de bord Agent : statut de sa propre évaluation (convocation,
    résultat notifié) ;

-   Vue Division RH : consolidation des besoins de formation exprimés,
    statistiques agrégées par critère et par structure (à des fins de
    préparation du tableau de synthèse, sans accès aux commentaires
    individuels sensibles selon paramétrage).

11\. Documents générés par le système

  -------------------------------------------------------------------------
  **Document**             **Généré à   **Émetteur**       **Format**
                           l\'étape**                      
  ------------------------ ------------ ------------------ ----------------
  Note de service de       SP1          Directeur général  PDF signé
  lancement                                                

  Fiche d\'évaluation      SP1 → SP3    Système /          Écran + export
  vierge / renseignée                   Responsable        PDF
                                        hiérarchique       

  Fiche d\'évaluation      SP3          Responsable        PDF horodaté non
  signée (original                      hiérarchique +     modifiable
  numérique)                            Agent              

  Tableau de synthèse des  SP4          DAF / Division RH  Écran + export
  évaluations                                              Excel / PDF

  Tableau de synthèse      SP5          Directeur général  PDF horodaté
  annoté                                                   

  Courrier de notification SP6          DAF                PDF signé
  individuel                                               
  -------------------------------------------------------------------------

12\. Matrice RACI

R = Réalise, A = Approuve (responsable final), C = Consulté, I =
Informé.

  -----------------------------------------------------------------------------------------------
  **Sous-procédure**   **DG**   **SG**   **Resp.          **DAF**   **Division   **Agent**
                                         hiérarchique**             RH**         
  -------------------- -------- -------- ---------------- --------- ------------ ----------------
  SP1 --- Lancer la    A/R      C        I                I         I            I
  campagne                                                                       

  SP2 --- Planifier    I        I        A/R              I         I            I
  les entretiens                                                                 

  SP3 --- Évaluer et   I        I        A/R              I         I            C/R (signature)
  transmettre                                                                    

  SP4 --- Élaborer le  I        I        I                A/R       C            I
  tableau de synthèse                                                            

  SP5 --- Étudier,     A/R      C        I                I         I            I
  décider, transmettre                                                           

  SP6 --- Informer les I        I        I                A/R       I            I (destinataire)
  agents                                                                         
  -----------------------------------------------------------------------------------------------

13\. Exigences non fonctionnelles

-   Sécurité : authentification via le module d\'identité déjà en place
    dans NiidPro, gestion fine des droits par rôle et par relation
    hiérarchique (§ 5 et § 9) ;

-   Disponibilité : le module doit rester utilisable en période de forte
    campagne (pic de connexions en octobre-décembre) sans dégradation de
    performance ;

-   Auditabilité : conservation exhaustive et non altérable des journaux
    d\'action (§ 9) ;

-   Multi-structure / multi-tenant : le référentiel de critères, le
    calendrier et les modèles de documents doivent être paramétrables
    par organisation cliente de NiidPro, l\'ANASER n\'étant qu\'un des
    paramétrages possibles ;

-   Accessibilité et ergonomie : formulaires de notation utilisables en
    séance d\'entretien (saisie rapide, sauvegarde automatique du
    brouillon) ;

-   Compatibilité mobile : consultation des convocations, accord de
    signature et consultation du résultat notifié accessibles depuis
    l\'application mobile (Flutter) de NiidPro pour les agents ;

-   Internationalisation : interface en français dans un premier temps,
    architecture prête pour une traduction future ;

-   Réversibilité des données : export complet d\'une campagne (fiches,
    synthèses, décisions) en formats standards (PDF, Excel, JSON) à tout
    moment.

14\. Liste des écrans du module

  ----------------------------------------------------------------------------
  **\#**   **Écran**                                **Rôle(s) principal(aux)**
  -------- ---------------------------------------- --------------------------
  1        Paramétrage des critères d\'évaluation   Administrateur RH

  2        Paramétrage du calendrier de campagne    Administrateur RH

  3        Rapport d\'anomalies d\'organigramme     Administrateur RH

  4        Création et lancement de campagne        DG, Administrateur RH

  5        Validation et signature de la note de    DG
           service                                  

  6        Suivi de diffusion des fiches            DG, SG, DAF, Division RH

  7        Mes évaluations à planifier              Responsable hiérarchique

  8        Mes convocations                         Agent évalué

  9        Conduite de l\'entretien / Notation      Responsable hiérarchique

  10       Accord et signature                      Agent évalué

  11       Mes évaluations menées (historique)      Responsable hiérarchique

  12       Réception des fiches                     DAF, Division RH

  13       Tableau de synthèse des évaluations      DAF, Division RH, DG

  14       Étude et décision (rapport de synthèse)  DG, SG

  15       Décisions de gratification               DG

  16       Notification des agents (génération      DAF
           courriers)                               

  17       Mon évaluation (consultation résultat)   Agent évalué

  18       Tableau de bord campagne                 DG, SG, DAF, Division RH,
                                                    Administrateur RH

  19       Historique des campagnes                 Tous rôles habilités

  20       Journal d\'audit                         Administrateur RH, DAF
  ----------------------------------------------------------------------------

15\. Glossaire

  -----------------------------------------------------------------------
  **Terme**             **Définition**
  --------------------- -------------------------------------------------
  ANASER                Agence Nationale de la Sécurité Routière

  DAF                   Directeur Administratif et Financier

  DG                    Directeur général

  SG                    Secrétaire général

  SIRH                  Système d\'Information de Gestion des Ressources
                        Humaines

  NiidPro               Plateforme SIRH développée par DstComputing

  Sous-procédure        Étape structurée de la procédure d\'évaluation
                        telle que définie dans le Manuel de procédures
                        ANASER

  Campagne              Cycle annuel complet d\'évaluation du personnel,
  d\'évaluation         du lancement à l\'archivage

  Fiche d\'évaluation   Document individuel enregistrant la notation, les
                        commentaires, le bilan et les objectifs d\'un
                        agent pour une campagne donnée

  Tableau de synthèse   Document consolidant, par structure, les
                        résultats des fiches d\'évaluation signées
  -----------------------------------------------------------------------

*Fin du document --- Cahier des charges fonctionnel « Gestion des
Évaluations du Personnel » --- Plateforme NiidPro --- DstComputing*
