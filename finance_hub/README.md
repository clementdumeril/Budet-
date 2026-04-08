# Finance Hub

Finance Hub est l'application principale du depot. Elle fournit une interface simple pour suivre depenses, comptes, epargne, imports CSV et tendances budgetaires en local.

## Lancement le plus simple

Depuis le dossier parent qui contient `finance_hub`:

```bat
setup.bat
start.bat
```

Version PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Le `setup` prepare le venv Python, installe les dependances frontend et cree les `.env` manquants a partir des exemples.

## Lancement manuel

### Backend

```bat
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bat
cd frontend
npm ci
npm run dev
```

Frontend: `http://127.0.0.1:5173`  
Backend: `http://127.0.0.1:8000`

## Connexion locale

Au premier lancement, si la base est vide, l'application cree un compte de demo:

- email: `demo@financehub.local`
- mot de passe: `demo1234`

## Fonctionnalites

- authentification par session
- dashboard budgetaire avec graphiques
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
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `VITE_API_BASE_URL`

## Structure

- `backend/`: API FastAPI et routes
- `services/`: auth, parsing CSV, bootstrap
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
- n'expose jamais `data/budget.db`
- ne committe pas de CSV personnels

## Securite et licence

- securite: `SECURITY.md`
- licence: `LICENSE`
