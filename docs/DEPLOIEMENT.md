# Guide de déploiement — RH+PAIE (cPanel)

| Composant | Sous-domaine | Répertoire | Stack |
|---|---|---|---|
| **API** (Laravel) | `apirh.lamadoneadn.com` | `/public_html/apirh` | PHP 8.2 + MySQL |
| **Frontend** (React/PWA) | `rh.lamadoneadn.com` | `/public_html/rh` | fichiers statiques |

> Pré-requis cPanel : **PHP 8.2** (MultiPHP Manager) pour le sous-domaine API, accès **Terminal/SSH** (fortement recommandé pour Composer + migrations), base **MySQL**.

---

## A. BACKEND — `apirh.lamadoneadn.com`

### 1. Base de données
Dans cPanel → **MySQL Databases** :
- Crée une base (ex. `lamadon_rh`), un utilisateur, attache l'utilisateur à la base (tous privilèges).
- Note : nom base, utilisateur, mot de passe → iront dans `.env`.

### 2. Sous-domaine
cPanel → **Domains / Subdomains** → créer `apirh` :
- **Idéal** : Document Root = `/public_html/apirh/public` (pointe sur le dossier `public` de Laravel — plus sûr).
- Si impossible (root figé à `/public_html/apirh`) : on utilisera le `.htaccess` racine fourni (étape 6-bis).

### 3. Envoi des fichiers Laravel
Envoie **tout le dossier `api/`** dans `/public_html/apirh` **SAUF** : `node_modules`, `.git`, `tests`.
- `vendor/` : soit tu l'envoies, soit tu lances `composer install` sur le serveur (étape 4).
- N'envoie **pas** ton `.env` local. On le crée à l'étape 5.

### 4. Dépendances (Terminal cPanel / SSH)
```bash
cd ~/public_html/apirh
composer install --no-dev --optimize-autoloader
```
*(Pas de SSH ? Lance `composer install` en local puis envoie le dossier `vendor/`.)*

### 5. Configuration `.env`
- Copie **`.env.production.example`** (fourni) en **`.env`** dans `/public_html/apirh`.
- Remplis : `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, et le SMTP si besoin.
- Génère la clé :
```bash
php artisan key:generate
```

### 6. Base, stockage, cache (Terminal)
```bash
php artisan migrate --force        # crée les tables
php artisan db:seed --force        # rôles, permissions, admin, structure ANASER
php artisan storage:link           # lien public/storage → storage/app/public
php artisan config:cache
php artisan route:cache
```
> **Astuce (recommandée)** : plutôt que `migrate + seed`, tu peux **exporter ta base locale** (phpMyAdmin → Export) et l'**importer** sur le serveur. Tu récupères ainsi TOUT ton paramétrage déjà fait (entreprise ANASER, départements, comptes…). Dans ce cas, ne lance pas `db:seed`.

### 6-bis. Si Document Root = `/public_html/apirh` (pas `/public`)
Place le fichier **`api/deploy/apirh-root.htaccess`** dans `/public_html/apirh` en le renommant **`.htaccess`**.

### 7. Permissions
```bash
chmod -R 775 storage bootstrap/cache
```

### 8. Vérifier
Ouvre `https://apirh.lamadoneadn.com/api/health` → doit renvoyer `{"status":"ok",...}`.

---

## B. FRONTEND — `rh.lamadoneadn.com`

### 1. Build (sur ta machine)
Le fichier **`frontend/.env.production`** pointe déjà vers `https://apirh.lamadoneadn.com/api`.
```powershell
cd frontend
npx vite build
```
→ génère le dossier **`frontend/dist/`** (avec `index.html`, `assets/`, `sw.js`, `manifest.webmanifest`, `.htaccess`).

### 2. Envoi
Envoie **le contenu de `dist/`** (pas le dossier lui-même) dans **`/public_html/rh`**.
Le `.htaccess` (routage SPA + HTTPS + cache) y est déjà inclus.

### 3. Vérifier
Ouvre `https://rh.lamadoneadn.com` → la page de connexion s'affiche.

---

## C. APRÈS DÉPLOIEMENT

1. **Connexion admin** : `admin@niidpro.com` / `password`
   → **change immédiatement le mot de passe** (menu profil) et l'email.
2. **Configuration › Entreprise** : logo, coordonnées, **latitude/longitude + rayon de pointage**.
3. **Configuration › Utilisateurs** : crée les comptes des agents (rôle `employe`).
   ⚠️ Chaque agent doit être **rattaché à une fiche employé** pour accéder au portail.
4. **Configuration › Mailing** : paramètres SMTP (ou via le `.env`).
5. **PWA** : sur `https://rh.lamadoneadn.com`, les agents peuvent **installer l'app** sur leur téléphone (Chrome → Installer / iPhone → Partager → Sur l'écran d'accueil). Le HTTPS du domaine l'active automatiquement.

---

## D. DÉPANNAGE

| Symptôme | Cause / solution |
|---|---|
| **500** sur l'API | `APP_KEY` vide (`php artisan key:generate`) ; permissions `storage/` (775) ; `APP_DEBUG=true` temporairement pour voir l'erreur. |
| **Erreur CORS** dans la console | `FRONTEND_URL=https://rh.lamadoneadn.com` dans `.env`, puis `php artisan config:cache`. |
| **Photos / logo ne s'affichent pas** | `php artisan storage:link` ; vérifier `APP_URL=https://apirh.lamadoneadn.com`. |
| **404 en rechargeant une page** (frontend) | Le `.htaccess` SPA n'a pas été envoyé dans `/public_html/rh`. |
| **Page blanche frontend** | Mauvais `VITE_API_URL` au build → rebuild après correction. |
| **« Mixed content »** | Tout doit être en **https** (API et front) — déjà forcé par les `.htaccess`. |
| Changements `.env` non pris en compte | `php artisan config:clear` puis `config:cache`. |

---

## E. MISES À JOUR ULTÉRIEURES

- **Frontend** : `npx vite build` en local → remplacer le contenu de `/public_html/rh`.
- **Backend** : envoyer les fichiers modifiés → `php artisan migrate --force` (si nouvelles migrations) → `php artisan config:cache route:cache`.
