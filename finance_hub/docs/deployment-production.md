# Deploiement production

## Architecture recommandee

- frontend statique sur GitHub Pages
- backend FastAPI sur Render ou Railway
- base Postgres geree par le provider backend

Ce repo est un monorepo isole:

- frontend: `finance_hub/frontend`
- backend: `finance_hub`

## Prerequis de production

Avant tout deploy:

- `BOOTSTRAP_DEMO_DATA=false`
- `SESSION_SECRET` fort et unique
- `SESSION_SAME_SITE=none` si frontend et backend ont des domaines differents
- `CORS_ORIGINS` doit contenir le domaine exact du frontend
- `DATABASE_URL` doit pointer vers Postgres

Le backend normalise maintenant:

- `postgres://...`
- `postgresql://...`

vers un DSN SQLAlchemy compatible `psycopg`.

## GitHub Pages

Le repo contient deja un workflow GitHub Actions dans:

- `../.github/workflows/deploy-frontend-github-pages.yml`

et Vite est configure pour publier le frontend sur le sous-chemin du repo:

- repo GitHub: `clementdumeril/Budet-`
- URL Pages attendue: `https://clementdumeril.github.io/Budet-/`

Secret GitHub Actions a definir dans le repo:

- `VITE_API_BASE_URL=https://<ton-backend>`

Activation recommandee:

1. Ouvrir le repo GitHub
2. Aller dans `Settings > Pages`
3. Choisir `Source: GitHub Actions`
4. Ajouter le secret `VITE_API_BASE_URL`
5. Push sur `main`
6. Attendre l'execution du workflow Pages

Le workflow build seulement `finance_hub/frontend` et publie `dist/`.

## Render

Le repo contient un `render.yaml` racine qui cree:

- un web service `finance-hub-api`
- une base Postgres `finance-hub-db`

Le Blueprint demande encore ces variables dans le dashboard:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CORS_ORIGINS`

Flux recommande:

1. Connecter le repo GitHub dans Render
2. Creer le Blueprint depuis `render.yaml`
3. Renseigner `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGINS`
4. Attendre la creation de la base et du service
5. Recuperer l'URL publique du backend
6. Reporter cette URL dans le secret GitHub `VITE_API_BASE_URL`

Une fois la premiere connexion admin verifiee:

- garder `BOOTSTRAP_ADMIN=true` si tu veux la recreation auto seulement quand l'email n'existe pas
- ou passer `BOOTSTRAP_ADMIN=false` dans le dashboard si tu veux figer ce comportement

## Railway

Railway ne lira pas automatiquement de config monorepo pour le root directory. La doc Railway recommande de definir un root directory pour les monorepos isoles.

Configuration conseillee pour le service backend:

- Root Directory: `/finance_hub`
- Build Command: laisser Railpack detecter, ou `pip install -r requirements.txt`
- Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Healthcheck Path: `/api/health`

Ajouter ensuite un service Postgres dans le meme projet, puis definir:

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `APP_ENV=production`
- `BOOTSTRAP_DEMO_DATA=false`
- `BOOTSTRAP_ADMIN=true`
- `SESSION_SECRET=<secret long>`
- `SESSION_SAME_SITE=none`
- `ADMIN_EMAIL=<email admin>`
- `ADMIN_PASSWORD=<mot de passe fort>`
- `ADMIN_NAME=Finance Hub Admin`
- `CORS_ORIGINS=https://<ton-frontend-netlify>`
  Exemple ici: `CORS_ORIGINS=https://clementdumeril.github.io`

Une fois le backend deploye:

1. generer un domaine public Railway
2. reporter ce domaine dans le secret GitHub `VITE_API_BASE_URL`
3. relancer le workflow Pages

## Variables prêtes a copier

### Backend

```env
APP_ENV=production
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME
BOOTSTRAP_DEMO_DATA=false
BOOTSTRAP_ADMIN=true
CORS_ORIGINS=https://budget.example.com
SESSION_SECRET=replace-with-a-long-random-secret
SESSION_SAME_SITE=none
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_NAME=Finance Hub Admin
```

### Frontend GitHub Pages

```env
VITE_API_BASE_URL=https://finance-hub-api.example.com
```

## Checks post-deploy

- `GET /api/health` renvoie `200`
- login admin OK
- cookie de session present apres login
- `GET /api/budget-plan` renvoie `200`
- le frontend charge sans erreur reseau ni CORS
- le site GitHub Pages sert bien `https://clementdumeril.github.io/Budet-/`
