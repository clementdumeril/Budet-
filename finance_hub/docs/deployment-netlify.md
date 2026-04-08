# Deploiement

## Recommandation simple

Pour une vraie instance partagee:

- frontend sur Netlify ou Vercel
- backend FastAPI sur Render, Railway ou Fly.io
- base Postgres

## Pourquoi separer front et back

Le frontend est statique.

Le backend doit gerer:

- authentification
- base relationnelle
- imports de fichiers
- calculs budgetaires

## SQLite

SQLite est tres bien:

- en local
- pour du dev
- pour une machine unique

SQLite est a eviter pour une vraie instance publique multi-utilisateurs.

## Checklist avant de deployer

1. changer `SESSION_SECRET`
2. changer les credentials demo
3. desactiver les donnees de demo si besoin
4. verifier les CORS
5. utiliser HTTPS
6. passer la base sur Postgres
