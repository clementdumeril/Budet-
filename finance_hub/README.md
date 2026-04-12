# Finance Hub

Finance Hub est maintenant une application locale `local-first` avec wrapper desktop Tauri.

Le mode recommande est:

- app desktop locale
- saisie manuelle claire pour comptes, placements et prets
- imports `notes/CSV + preview`
- publication de snapshots statiques depuis l'app

## Lancement principal

Depuis le dossier parent qui contient `finance_hub`:

```bat
..\FinanceHubDesktop.bat
```

## Lancement frontend seul

Depuis `frontend/`:

```bat
npm run build
```

## Wrapper desktop

La couche desktop est dans:

- `frontend/src-tauri/`

Guide associe:

- `docs/desktop-wrapper.md`

## Mode backend legacy

L'ancien mode backend local/public existe encore seulement comme couche legacy technique.

Les anciens points d'entree racine ont ete deplaces dans:

- `../archive/runtime_legacy/`

## Lancement manuel

### Backend legacy

```bat
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
cd frontend
npm ci
npm run build
cd ..
.venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Application legacy: `http://127.0.0.1:8000`

## Session locale

Le mode normal est maintenant mono-utilisateur local.

Le frontend ouvre directement le profil local sans parcours de login visible.

## Fonctionnalites

- dashboard budgetaire avec graphiques
- budget mensuel `prevu vs reel`
- cash flow et repartition par categories
- suivi des comptes
- suivi des investissements
- suivi des prets
- saisie manuelle des transactions
- import CSV avec preview
- import notes avec preview
- wrapper desktop Windows

## Donnees de demo

Par defaut, le frontend charge `frontend/public/demo-budget.csv` au premier lancement local.

## Variables d'environnement

Exemples:

- `.env.example`
- `frontend/.env.example`

Variables principales:

- `DATABASE_URL`
- `CSV_PATH`
- `BOOTSTRAP_DEMO_DATA`
- `BOOTSTRAP_ADMIN`
- `SESSION_SECRET`
- `SESSION_SAME_SITE`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `REPORT_PUBLISH_DIR`
- `REPORT_TITLE`
- `REPORT_RECENT_MONTHS`
- `REPORT_INCLUDE_TRANSACTIONS`

Le mode principal n'a plus besoin d'API distante pour fonctionner.

Pour publier un snapshot statique:

- utilise l'ecran `Donnees` dans l'app
- exporte le CSV
- ou publie le snapshot HTML/JSON dans un dossier local

Guide publication de rapports:

- `docs/report-publishing.md`
- `docs/desktop-wrapper.md`

Pour l'ancien mode frontend sur Netlify avec backend separe:

- configure `CORS_ORIGINS` avec le domaine du frontend
- passe `SESSION_SAME_SITE=none`
- garde `APP_ENV=production`
- active HTTPS cote backend

Guide production:

- `docs/deployment-production.md`
- `../.github/workflows/deploy-frontend-github-pages.yml`

## Structure

- `frontend/`: application principale
- `frontend/src-tauri/`: wrapper desktop
- `backend/`: couche legacy FastAPI
- `services/`: services legacy Python
- `data/`: CSV demo et base locale
- `docs/`: documentation technique
- `scripts/`: checks locaux

## Checks locaux

Backend smoke check:

```bat
.venv\Scripts\python scripts\smoke_check.py
```

Frontend build:

```bat
cd frontend
npm run build
```

## Publication

Avant de publier une instance:

- change `SESSION_SECRET`
- change les identifiants demo
- desactive `BOOTSTRAP_ADMIN` apres initialisation si tu ne veux plus de creation auto
- n'expose jamais `data/budget.db`
- ne committe pas de CSV personnels
- prefere publier `index.html` et `report.json` depuis `REPORT_PUBLISH_DIR`, pas l'application complete

## Securite et licence

- securite: `SECURITY.md`
- licence: `LICENSE`
