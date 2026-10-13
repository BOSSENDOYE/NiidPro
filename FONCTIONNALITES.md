# NiidPro — Présentation des Fonctionnalités
> Plateforme RH & Paie — ANASER (Agence Nationale de la Sécurité Routière du Sénégal)

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Gestion des Agents (GRH)](#2-gestion-des-agents-grh)
3. [Enrôlement Public](#3-enrôlement-public)
4. [Organigramme & Structure Organisationnelle](#4-organigramme--structure-organisationnelle)
5. [Paie & Bulletin de Salaire](#5-paie--bulletin-de-salaire)
6. [Évaluation Annuelle des Performances](#6-évaluation-annuelle-des-performances)
7. [Gestion des Congés & Absences](#7-gestion-des-congés--absences)
8. [Recrutement & Plan RH](#8-recrutement--plan-rh)
9. [Présences & Pointage](#9-présences--pointage)
10. [Assistant IA RH](#10-assistant-ia-rh)
11. [Administration & Sécurité](#11-administration--sécurité)
12. [Stack Technique](#12-stack-technique)

---

## 1. Vue d'ensemble

**NiidPro** est la plateforme de gestion des ressources humaines interne de l'ANASER. Elle centralise l'ensemble du cycle de vie des agents — de l'enrôlement jusqu'à l'évaluation annuelle — en remplaçant les fichiers Excel dispersés par un système unifié, sécurisé et traçable.

| Caractéristique | Détail |
|---|---|
| **Organisation** | ANASER — Sénégal |
| **Charte graphique** | Navy `#002f59` + Orange `#ff7631` |
| **Utilisateurs** | DRH, Administrateur, Comptable, Responsable, Agent |
| **Architecture** | API REST Laravel + SPA React |
| **Hébergement** | Serveur Apache (XAMPP, port 8000) |

---

## 2. Gestion des Agents (GRH)

### 2.1 Dossier Agent — Formulaire Wizard (7 onglets)

Le formulaire de création et de modification d'un agent est organisé en **7 onglets** accessibles séquentiellement ou librement.

#### Onglet 1 — Filiations
- Informations d'identité : prénom, nom, matricule, date et lieu de naissance, nationalité, sexe
- Photo de profil (upload avec recadrage intégré)
- Coordonnées : téléphone fixe, cellulaire, adresse, email professionnel
- Statut du dossier : **Actif / Inactif / Suspendu**

#### Onglet 2 — Contrat & Statut
- Type de contrat (CDI, CDD, Stage, Apprentissage, Freelance, Intérim)
- Durée du contrat, date de début et date de fin
- Date d'embauche, ancienneté calculée automatiquement
- Date de retraite estimée selon l'âge de retraite configuré
- Salaire de base, jours de congé annuels

#### Onglet 3 — Conjoints / Enfants
- Situation matrimoniale (Célibataire, Marié·e, Divorcé·e, Veuf/Veuve)
- Nombre d'épouses et d'enfants
- Tableau des membres de la famille : relation, prénom, nom, date et lieu de naissance, sexe, activité, type de document

#### Onglet 4 — Diplômes / Qualifications
- Tableau des diplômes : établissement, adresse, date d'obtention, mention, niveau (BEP → Doctorat)
- Tableau des qualifications professionnelles

#### Onglet 5 — Catégories / Postes
- Historique des catégories obtenues avec dates et motifs
- Tableau des affectations successives aux postes : poste, service, division, bureau, dates, raison

#### Onglet 6 — Documents Administratifs
- Gestion des pièces jointes : CIN, Passeport, Acte de naissance, Diplôme, Contrat, Autre
- Upload de fichiers (PDF, JPEG, PNG, DOCX, XLSX)
- Libellé et description par document

#### Onglet 7 — Info par Indice (Paie)
- Sélection du grade (grille indiciaire)
- Calcul automatique : hiérarchie, classe, échelon, valeur indiciaire, code indice
- Complément spécial de solde (20%), indemnité de résidence (14%), solde mensuelle indiciaire
- Modèle de bulletin de paie, Part TRIMF, Part IR
- Section médecin : sursalaire, indemnités spécifiques

### 2.2 Champ Fonction (Autocomplétion)

- **Autocomplete freeSolo** sur la ligne Structure / Direction / Division
- Liste les fonctions déjà enregistrées dans la base (endpoint `GET /employees/fonctions`)
- Permet de saisir librement une nouvelle fonction
- Disponible en mode création, modification et consultation

### 2.3 Structure Organisationnelle dans le Dossier

- Sélecteur **Direction / Entité** avec code et libellé
- Sélecteur **Division / Service** en cascade (enfants de la direction choisie)
- Synchronisation automatique du champ Structure (département) depuis la direction sélectionnée

### 2.4 Import / Export

- **Import Excel** : création en masse d'agents depuis un fichier Excel (.xlsx)
  - Retour détaillé : nombre créés, lignes ignorées avec motif
- **Export Excel** : extraction de la liste complète des agents avec filtres

### 2.5 Vue Détail Agent

- Page de consultation complète du dossier
- Affichage de la photo, des informations contractuelles, organisationnelles et de paie
- Accès rapide aux actions : modifier, désactiver, générer bulletin

---

## 3. Enrôlement Public

### 3.1 Formulaire d'enrôlement sans authentification

Page publique accessible sans compte, permettant à un candidat de soumettre sa demande d'intégration.

**Champs du formulaire :**
- Photo (upload avec recadrage)
- Matricule, prénom, nom
- Date et lieu de naissance
- Date d'embauche
- **Direction / Entité** et **Division / Service** (sélecteurs cascade)
- **Fonction** (Autocomplete freeSolo — liste les fonctions existantes ou saisie libre)
- Catégorie, qualification
- Téléphone, email, adresse

**Fonctionnalités :**
- Validation locale avant soumission
- Message de confirmation ou d'erreur
- Chargement dynamique des unités organisationnelles depuis l'API publique
- Chargement des fonctions existantes depuis l'API publique (`GET /enroll/fonctions`)

### 3.2 Workflow de validation RH

1. L'agent soumet son formulaire d'enrôlement
2. La demande apparaît dans la file d'attente RH (`/enrollments`)
3. Le DRH consulte le dossier et prend une décision :
   - **Valider** → création automatique du compte agent et du dossier
   - **Rejeter** → notification email à l'agent avec motif
4. En cas de validation, un email de bienvenue avec identifiants est envoyé

---

## 4. Organigramme & Structure Organisationnelle

### 4.1 Arbre hiérarchique

Visualisation en arbre de l'ensemble de la structure organisationnelle de l'ANASER :

| Niveau | Type | Exemples |
|---|---|---|
| 0 | Gouvernance | Conseil d'Administration, Direction Générale |
| 1 | Direction | Direction Technique, Direction Administrative |
| 2 | Division | Division RH, Division Financière |
| 3 | Service / Cellule / Appui | Service Paie, Cellule Juridique |

### 4.2 Création / Modification d'une Entité

**Champs disponibles :**
- Code (unique), libellé
- Type : gouvernance / direction / division / appui / cellule
- Niveau hiérarchique, ordre d'affichage
- Unité parente (parent_id)
- **Responsable Hiérarchique** : Autocomplete avec recherche parmi tous les agents actifs

**Affichage dans l'arbre :**
- Colonne **Responsable** avec le nom complet du responsable désigné
- Indicateur "— sans responsable" pour les entités non encore pourvues
- Nombre d'agents rattachés par entité

### 4.3 Affectation en Lot (Correction Organigramme)

Outil de correction massive destiné à régler les anomalies avant le lancement d'une campagne d'évaluation.

**Fonctionnement :**
1. Détection automatique des agents sans responsable hiérarchique
2. Ouverture d'un dialog listant les agents concernés
3. Sélection de la Direction, du Service et du Responsable à affecter en lot
4. Mise à jour simultanée de tous les agents sélectionnés
5. **Synchronisation automatique des fiches d'évaluation** existantes (`snapshot_direction`, `snapshot_service`, `snapshot_superieur`, `evaluateur_id`)

---

## 5. Paie & Bulletin de Salaire

### 5.1 Grille Indiciaire

- Référentiel des indices RH officiels (grade, classe, échelon, valeur indiciaire)
- Hiérarchies salariales configurables
- Solde mensuelle indiciaire calculée automatiquement

### 5.2 Modèles de Bulletin de Paie

- Création de modèles personnalisés (lignes de paie, cotisations, primes)
- Affectation d'un modèle par agent
- Paramètres par agent : Part TRIMF, Part IR, indemnité de sujétion

### 5.3 Calcul IRPP

Calcul automatique de l'Impôt sur le Revenu des Personnes Physiques :
- Tranche nette imposable (TRINF)
- Impôt sur le revenu net
- Montant IRPP final

### 5.4 Composantes du Salaire

| Composante | Calcul |
|---|---|
| Salaire de base | Saisi manuellement |
| Valeur indiciaire | Depuis la grille indiciaire |
| Complément spécial de solde | 20% du solde mensuelle indiciaire |
| Indemnité de résidence | 14% du solde mensuelle indiciaire |
| Indemnité de sujétion | Saisie libre |
| Heures supplémentaires | Calculées depuis les pointages |
| Rappel d'avancement | Saisie libre |

### 5.5 Historique & Export

- Historique des bulletins par agent et par mois
- Export PDF des bulletins individuels

---

## 6. Évaluation Annuelle des Performances

Module complet d'évaluation annuelle structuré en **6 étapes (SP1 à SP6)**.

### 6.1 Campagnes d'Évaluation

**Création d'une campagne :**
- Titre, description, année d'évaluation
- Sélection du référentiel de critères
- Date d'ouverture et date de clôture
- Statut : Brouillon → En cours → Clôturée → Archivée

**Vérifications pré-lancement (bloquantes) :**
1. Référentiel configuré avec au moins un critère actif
2. Date de clôture renseignée
3. Note de service signée
4. Tous les agents actifs ont un responsable hiérarchique

### 6.2 Référentiel de Critères

- Création de référentiels nommés et versionnés
- Ajout des critères d'évaluation avec pondération
- Option **seed automatique** : 13 critères officiels ANASER pré-configurés
- Possibilité de créer un référentiel directement depuis le dialog de campagne

### 6.3 Note de Service

Processus formel obligatoire avant le lancement :

1. **Génération** : le système produit automatiquement le texte de la note (objet, destinataires, corps, date)
2. **Édition** : le Directeur Général peut modifier librement le texte
3. **Signature** : validation numérique avec horodatage (`note_service_signee_at`)
4. **Téléchargement PDF** : export sécurisé via token Bearer (téléchargement côté client avec Blob)
5. Le bouton **"Lancer la campagne"** est désactivé tant que la note n'est pas signée

### 6.4 Fiches d'Évaluation Individuelles

Lors du lancement, une fiche est générée automatiquement pour chaque agent actif avec :
- **Snapshots organisationnels** : direction, service, supérieur hiérarchique (état figé à la date de lancement)
- **Évaluateur** : le responsable hiérarchique désigné (`evaluateur_id`)
- Statut initial : `en_attente`

**Cycle de vie de la fiche :**
`en_attente` → `auto_evaluation` → `evaluation_responsable` → `validation_drh` → `signee` → `archivee`

### 6.5 Détection et Correction des Anomalies

Avant le lancement, si des agents sans responsable sont détectés :
- Toast d'erreur explicite avec le nombre d'agents concernés
- Ouverture automatique du **dialog de correction organigramme**
- Sélection en lot de la Direction, du Service et du Responsable
- Après correction, le bouton **"Lancer la campagne"** apparaît directement dans le dialog
- Les fiches d'évaluation existantes sont mises à jour en temps réel

### 6.6 Statuts des Fiches (Enum PHP 8.2 — 21 états)

```
en_attente, brouillon, auto_evaluation, soumise_agent,
evaluation_responsable, soumise_responsable, contestee,
en_revision, validation_drh, approuvee, refusee,
signee_agent, signee_responsable, signee_drh, signee,
publiee, archivee, annulee, incomplete, expiree, litige
```

---

## 7. Gestion des Congés & Absences

### 7.1 Types de Congés

| Type | Description |
|---|---|
| Congé annuel | Basé sur les jours accumulés selon l'ancienneté |
| Arrêt maladie | Avec justificatif médical |
| Congé maternité/paternité | Durée légale |
| Congé sans solde | Sur demande spéciale |
| Absence | Enregistrement simple d'une absence |

### 7.2 Workflow de Demande

1. L'agent soumet sa demande en ligne (dates, type, motif)
2. **Niveau 1** : validation par le responsable hiérarchique direct
3. **Niveau 2** : approbation finale par le DRH
4. Notification à chaque étape
5. Mise à jour automatique du solde de congés

### 7.3 Suivi & Solde

- Solde de congés calculé automatiquement (30 jours/an par défaut, configurable)
- Historique complet par agent
- Vue calendrier des congés de l'équipe
- Tableau de bord absences par direction / mois

---

## 8. Recrutement & Plan RH

### 8.1 Offres d'Emploi (Job Postings)

- Création d'offres publiques : titre, description, compétences requises, type de contrat, date limite
- Gestion du statut : Brouillon / Publiée / Clôturée / Archivée
- Lien de candidature externe

### 8.2 Gestion des Candidatures

- Réception et classement des candidatures
- Statuts : Reçue → En cours → Entretien → Retenue → Refusée → Intégrée
- Pipeline visuel par offre
- Conversion d'un candidat retenu en agent (enrôlement simplifié)

### 8.3 Plan Annuel de Recrutement

- Postes budgétisés par direction
- Fiches de poste avec compétences, niveau requis et fourchette salariale
- Suivi des ouvertures de postes vs. effectifs réels

### 8.4 Grille Indiciaire Recrutement

- Référentiel des grades et échelons
- Fourchettes salariales par grade (base_salary_min / base_salary_max)
- Utilisé lors de la création du contrat d'un nouvel agent

---

## 9. Présences & Pointage

### 9.1 Enregistrement des Présences

- Pointage entrée / sortie par agent
- Calcul automatique de la durée de travail journalière
- Détection des retards (heure d'arrivée > heure officielle)

### 9.2 Heures Supplémentaires

- Calcul automatique des heures supplémentaires selon le seuil légal
- Montant des heures supplémentaires intégré dans la paie
- Paramétrage par mois et par agent

### 9.3 Heures de Coupure

- Enregistrement des interruptions de travail (déjeuner, sorties officielles)
- Déduction automatique du temps de présence effectif

### 9.4 Rapports Mensuels

- Vue récapitulative par agent et par direction
- Taux de présence, jours d'absence, retards
- Export des données de pointage

---

## 10. Assistant IA RH

### 10.1 Fonctionnement Général

Assistant conversationnel intégré à la plateforme, alimenté par l'**API Claude d'Anthropic**. Il peut répondre aux questions RH en consultant la base de données de manière sécurisée.

**Exemples de questions supportées :**
- "Combien d'agents sont en congé cette semaine ?"
- "Quels agents de la Direction Technique n'ont pas encore soumis leur auto-évaluation ?"
- "Quel est le salaire moyen par direction ?"
- "Liste les agents dont le contrat expire dans les 30 prochains jours"

### 10.2 Sécurité

| Mesure | Description |
|---|---|
| Clé API chiffrée | Stockée avec `Crypt::encryptString`, jamais exposée au frontend |
| Scoping par rôle | Les outils DB sont filtrés selon le rôle de l'utilisateur connecté |
| Interdiction SQL brut | Le modèle ne peut pas exécuter de requêtes SQL arbitraires |
| Audit complet | Chaque appel d'outil est enregistré dans `ia_audit_logs` |
| Prompt strict | System prompt imposant l'interdiction absolue d'inventer des données |

### 10.3 Bibliothèque de Fichiers

- Upload de documents de référence (procédures, règlements, circulaires)
- Le modèle peut citer ces documents dans ses réponses
- Gestion des fichiers contextuels par session

---

## 11. Administration & Sécurité

### 11.1 Gestion des Utilisateurs et Rôles

| Rôle | Accès |
|---|---|
| **Administrateur** | Accès complet à tous les modules |
| **DRH** | GRH, paie, évaluation, congés, recrutement |
| **Comptable** | Paie, bulletins, indices |
| **Responsable** | Validation congés équipe, évaluation des agents sous sa responsabilité |
| **Agent** | Consultation de son dossier, demande de congé, auto-évaluation |

### 11.2 Authentification

- **Laravel Sanctum** : tokens API Bearer
- Session sécurisée avec refresh automatique
- Déconnexion avec révocation du token

### 11.3 Paramètres de l'Application

- Nom de l'organisation et logo
- Paramètres de paie globaux
- Configuration des emails (SMTP)
- Gestion des années fiscales

### 11.4 Journalisation

- Audit des actions sensibles (modifications de salaire, validation de paie)
- Logs des appels IA (`ia_audit_logs`)
- Historique des modifications de dossier agent

---

## 12. Stack Technique

### Backend

| Composant | Technologie |
|---|---|
| Framework | Laravel 12 |
| Langage | PHP 8.2 |
| Authentification | Laravel Sanctum |
| Permissions | Spatie Laravel Permissions |
| Base de données | MySQL (via XAMPP) |
| Migrations | Laravel Migrations |
| Serveur | Apache XAMPP (port 8000) |
| IA | Claude API (Anthropic) |

### Frontend

| Composant | Technologie |
|---|---|
| Framework | React 18 |
| Langage | TypeScript |
| Build | Vite |
| UI Components | MUI v6 (Material UI) |
| État serveur | TanStack Query v5 |
| Formulaires | React Hook Form + Zod |
| Routing | React Router v6 |
| Requêtes HTTP | Axios |

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client (SPA)                   │
│         React 18 + TypeScript + MUI v6           │
│              localhost:5173 (dev)                │
└─────────────────────┬───────────────────────────┘
                      │ HTTP / REST API
                      │ Bearer Token (Sanctum)
┌─────────────────────▼───────────────────────────┐
│                 API Laravel 12                   │
│          Apache XAMPP — localhost:8000           │
│   Auth: Sanctum │ Permissions: Spatie RBAC       │
└──────┬──────────────────────────────┬────────────┘
       │                              │
┌──────▼──────┐              ┌────────▼────────┐
│   MySQL     │              │  Claude API      │
│  Base RH    │              │  (Anthropic)     │
│  ANASER     │              │  Clé chiffrée   │
└─────────────┘              └─────────────────┘
```

---

*Document généré le 18 août 2026 — NiidPro v2.0 — ANASER Sénégal*
