# Student Budget Hub

Student Budget Hub est un template open source pour aider des etudiants a suivre leur budget, leurs comptes, leurs imports CSV et leurs depenses recurrentes depuis une interface simple.

Le projet part d'un usage personnel, mais il a ete nettoye pour devenir un socle reusable:

- donnees de demo anonymisees
- branding generique
- setup local simple
- saisie manuelle directement dans l'interface
- import CSV optionnel

## Ce que le projet fait deja

- authentification par session
- dashboard budgetaire avec graphiques
- cash flow et repartition par categories
- page `Depenses` avec filtres et saisie manuelle
- page `Accounts` pour plusieurs comptes
- page `Investissements` pour l'epargne et les placements
- page `Data` pour preview et import CSV

## Cas d'usage cible

Le projet vise en priorite:

- etudiants qui veulent suivre leur budget sans banque connectee
- etudiants qui veulent importer un CSV de banque de temps en temps
- projets open source / associatifs autour du budget etudiant

## Stack

- frontend: Vite + TypeScript + Chart.js
- backend: FastAPI + SQLAlchemy
- stockage local: SQLite
- import: pandas
- auth: cookie de session HTTP-only

## Lancement rapide

Depuis le dossier parent qui contient `finance_hub` (par exemple `Budget`), tu peux aussi lancer les deux serveurs avec:

```powershell
.\start.bat
```

ou

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Ces scripts:

- ciblent automatiquement `finance_hub`
- lancent backend + frontend dans deux fenetres separees
- verifient seulement que le setup minimal existe deja (`.venv` et `frontend/node_modules`)

### 1. Backend

Depuis la racine du projet:

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend

Dans un second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Frontend: `http://127.0.0.1:5173`  
Backend: `http://127.0.0.1:8000`

## Compte demo local

Au premier lancement, si la base est vide, l'application cree un compte de demo:

- email: `demo@studentbudget.local`
- mot de passe: `demo1234`

Ces identifiants sont uniquement la pour le dev local. Change-les avant toute publication d'une instance.

## Demo data

Par defaut, le projet bootstrape un dataset anonyme situe dans `data/demo-budget.csv`.

Tu peux desactiver ce comportement avec:

```env
BOOTSTRAP_DEMO_DATA=false
```

Dans ce mode, l'application demarre vide et tu peux:

- saisir les depenses a la main dans `Depenses`
- importer un CSV depuis `Data`

## Variables d'environnement

Exemple complet: `.env.example`

Variables principales:

- `DATABASE_URL`
- `CSV_PATH`
- `BOOTSTRAP_DEMO_DATA`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

Frontend:

- `VITE_API_BASE_URL` dans `frontend/.env.example`

## Structure

- `backend/`: API FastAPI et routes metier
- `services/`: parsing CSV, auth et seed demo
- `frontend/`: interface Vite/TypeScript
- `data/`: CSV demo et base SQLite locale
- `docs/`: architecture, modele de donnees, deploiement
- `scripts/`: checks simples pour local et CI

## Checks locaux

Backend smoke check:

```bash
.venv\Scripts\python scripts/smoke_check.py
```

Frontend build:

```bash
cd frontend
npm run build
```

## Avant de publier ton fork ou ton instance

- change `SESSION_SECRET`
- change les credentials demo
- n'expose jamais `data/budget.db`
- ne committe pas tes CSV bancaires
- bascule sur Postgres si tu heberges une vraie instance partagee

## Roadmap recommande

1. ajouter `account_id` sur les transactions
2. ajouter `income / expense / transfer`
3. ajouter budgets mensuels et objectifs d'epargne
4. ajouter edition et suppression inline
5. ajouter onboarding vide au premier lancement
6. ajouter importeurs CSV multi-banques

## Contribuer

Lis `CONTRIBUTING.md` avant d'ouvrir une pull request.

## Securite

Voir `SECURITY.md`.

## Licence

MIT. Voir `LICENSE`.
