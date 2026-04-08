# Architecture cible

## Contrainte principale

Student Budget Hub doit pouvoir fonctionner dans deux contextes:

- usage local tres simple pour un etudiant
- instance partagee ou hebergee plus tard

Il faut donc separer clairement:

- le frontend
- l'API
- la base de donnees
- les imports de donnees brutes

## Architecture recommandee

```text
CSV banque / CSV broker / saisie manuelle
                  |
                  v
         Normalisation backend
                  |
                  v
         Base SQL principale
                  |
                  v
         API FastAPI securisee
                  |
                  v
     Frontend Vite + TypeScript
```

## Source de verite

La source de verite doit etre la base SQL, pas les CSV.

Pourquoi:

- schema stable
- analytics fiables
- import batchable
- meilleure base pour les transactions, comptes et transferts

Les CSV restent des sources d'entree, pas des sources de verite.

## Frontend

Le frontend doit fournir:

- dashboard
- cash flow
- depenses avec saisie manuelle
- comptes
- investissements
- imports

## Backend

Le backend doit gerer:

- sessions
- utilisateurs
- import CSV
- normalisation des categories
- analytics
- CRUD transactions
- CRUD comptes, investissements et sources d'import

## Hebergement recommande

### Option locale

- frontend Vite
- backend FastAPI
- SQLite

### Option partagee

- frontend sur Netlify ou Vercel
- backend sur Render, Railway ou Fly.io
- base Postgres

## Ce qu'il faut eviter

- committer une vraie base SQLite utilisateur
- stocker des CSV bancaires personnels dans le repo
- faire reposer toute la logique metier sur le frontend
- lier le projet a une banque ou un broker des le depart
