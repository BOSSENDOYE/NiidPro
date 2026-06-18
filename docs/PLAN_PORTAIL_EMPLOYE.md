# Plan — Portail Employé (Web + PWA Mobile)

> Espace personnel pour les employés : chaque agent connecté ne voit **que ses
> propres informations** (dossier, congés, pointages, tâches, documents) et peut
> **se pointer s'il se trouve dans la zone de l'entreprise** (géolocalisation).

## Décisions validées

| Sujet | Choix |
|---|---|
| **Mobile** | PWA responsive (même app React, installable sur téléphone) |
| **Geofence pointage** | Rayon **configurable** (champ « rayon de pointage » dans Configuration › Entreprise) |
| **Accès employé** | **Portail dédié seul** — sidebar admin masquée, cloisonné aussi côté serveur |

---

## Existant réutilisable

- **`AgentPortalPage`** (≈289 lignes) : tableau de bord agent basique (congés +
  pointage du jour, filtrés côté client). Base à enrichir.
- **APIs prêtes** : congés (`list/create/types/balance/calculateDays`),
  pointages (`checkIn/checkOut/today`), tâches (avec `assigned_to` = employé),
  documents générés (liés à l'employé), employé (`get`).
- **Auth** : `hasRole('employe')`, `user.employee.id` disponibles.
- **Géolocalisation entreprise** (`latitude` / `longitude`) déjà ajoutée →
  base du pointage géolocalisé.

## Manques à construire

**Problème central** : aujourd'hui aucun cloisonnement par rôle — un employé voit
tout l'admin. Il faut un espace dédié et restreint (front **et** back).

---

## Backend

### Migrations
- `company_settings` → `pointage_radius` (entier, mètres ; rayon de pointage configurable).
- `attendances` → `latitude`, `longitude`, `distance_metres` (traçabilité du pointage).

### `MeController` (résolu depuis l'employé lié au compte ; 403 si non lié)
- `GET  /me/profile` — dossier complet (poste, direction, contrat, famille…)
- `GET  /me/leaves` · `POST /me/leaves` (demande) · `GET /me/leave-balance`
- `GET  /me/attendances` · `POST /me/attendances/check-in` (lat/lng → **geofence**) · `POST /me/attendances/check-out`
- `GET  /me/tasks` · `PATCH /me/tasks/{id}/status`
- `GET  /me/documents`

### Geofence
- Helper **Haversine** : refuse le pointage si distance au siège > `pointage_radius`.
- Coordonnées + distance enregistrées sur le pointage.

### Sécurité
- Chaque endpoint ne renvoie **que** les données de l'employé connecté.
  Jamais d'accès aux données d'un autre agent.

---

## Frontend

### Routage par rôle (`App.tsx`)
- Rôle `employe` → redirigé vers `/portail`, **sidebar admin masquée**, pages
  admin inaccessibles.

### `PortalLayout` dédié (mobile-first)
- Barre de navigation basse sur téléphone, en-tête avec logo entreprise + photo profil.

### Pages du portail
- **Accueil** — solde congés, pointage du jour, tâches à faire, prochains congés
- **Mon dossier** — infos perso, poste, direction, contrat, famille
- **Mes congés** — solde + historique + **formulaire de demande**
- **Mes pointages** — historique + gros bouton **« Me pointer »** (géolocalisé, contrôle de distance)
- **Mes tâches** — tâches affectées + changement de statut
- **Mes documents** — liste téléchargeable

### PWA
- `vite-plugin-pwa` (manifest + service worker + icônes) → installable sur
  téléphone, lancement plein écran, géoloc native du navigateur.

---

## Déroulé en phases

| Phase | Contenu |
|---|---|
| **1** | Cloisonnement par rôle + `PortalLayout` + `MeController` (squelette) + **Mon dossier** + **Accueil** |
| **2** | **Mes congés** (solde, historique, demande) + **Mes pointages** (historique) |
| **3** | **Pointage géolocalisé** (rayon configurable + geofence au check-in) |
| **4** | **Mes tâches** + **Mes documents** |
| **5** | **PWA** (installable mobile) + finitions responsive |

---

## Points d'attention

- **Cloisonnement par rôle** = chantier neuf principal (front + back).
- **Endpoints `/me/*`** : sécurité côté serveur impérative (pas un simple filtre front).
- **Geofence** : dépend de la précision GPS du téléphone — d'où le rayon configurable.
- **Lien compte ↔ employé** : un `User` doit être rattaché à un `Employee`
  (`employee.user_id`) pour accéder au portail.
