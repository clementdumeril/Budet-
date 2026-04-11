# Finance Hub

Finance Hub est l'application principale du depot. Elle fournit une interface simple pour suivre depenses, comptes, budgets mensuels, imports CSV et tendances budgetaires en local.

Le mode recommande est maintenant:

- application complete en local
- export de rapports statiques agreges vers un dossier cible
- GitHub comme depot d'installation, pas comme hebergement principal de tes donnees

## Lancement le plus simple

Depuis le dossier parent qui contient `finance_hub`:

```bat
FinanceHub.bat
```

Version PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\windows\setup.ps1
powershell -ExecutionPolicy Bypass -File .\tools\windows\start.ps1
```

Le lanceur principal verifie l'environnement, lance le `setup` seulement si besoin, coupe les anciens serveurs Finance Hub encore actifs et relance un backend propre qui sert l'interface sur `http://127.0.0.1:8000` ou sur le prochain port libre.

Scripts techniques disponibles si besoin:

- `tools/windows/setup.bat`
- `tools/windows/start.bat`
- `../PublishBudgetReport.bat`
- `../tools/windows/install_daily_report_task.ps1`

Les logs backend sont ecrits dans `data/logs/`.

## Lancement manuel

### Backend

```bat
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
cd frontend
npm ci
npm run build
cd ..
.venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Application: `http://127.0.0.1:8000`

## Connexion locale

Au premier lancement, si `BOOTSTRAP_ADMIN=true` et si la base est vide, l'application cree un compte de demo:

- email: `demo@financehub.local`
- mot de passe: `demo1234`

## Fonctionnalites

- authentification par session
- dashboard budgetaire avec graphiques
- budget mensuel `prevu vs reel`
- cash flow et repartition par categories
- suivi des comptes
- suivi des investissements
- saisie manuelle des transactions
- import CSV avec preview

## Donnees de demo

Par defaut, le projet charge `data/demo-budget.csv` si la base est vide.

Pour demarrer sans donnees de demo:

```env
BOOTSTRAP_DEMO_DATA=false
```

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

En local, le frontend utilise `/api` sur le meme serveur que le backend. `VITE_API_BASE_URL` reste optionnelle pour des cas avances.

Pour publier uniquement un snapshot statique:

- configure `REPORT_PUBLISH_DIR` vers ton site statique ou ton dossier Drive
- lance `../PublishBudgetReport.bat`
- ou installe la tache quotidienne Windows

Guide publication de rapports:

- `docs/report-publishing.md`

Pour un frontend sur Netlify avec backend separe:

- configure `CORS_ORIGINS` avec le domaine du frontend
- passe `SESSION_SAME_SITE=none`
- garde `APP_ENV=production`
- active HTTPS cote backend

Guide production:

- `docs/deployment-production.md`
- `../render.yaml`
- `../.github/workflows/deploy-frontend-github-pages.yml`

## Structure

- `backend/`: API FastAPI et routes
- `services/`: auth, parsing CSV, bootstrap
- `services/`: auth, parsing CSV, bootstrap, budget planning
- `frontend/`: application Vite/TypeScript
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
