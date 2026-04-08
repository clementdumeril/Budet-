# Contributing

Merci de contribuer a Student Budget Hub.

## Avant de commencer

- garde le projet generique: pas de donnees personnelles, pas de branding prive
- privilegie les exemples anonymises et les jeux de donnees de demo
- verifie que le frontend build et que le backend demarre

## Workflow recommande

1. cree une branche a partir de `main`
2. fais une modification ciblee et documentee
3. lance les checks locaux
4. ouvre une pull request avec le contexte, le changement et le risque

## Checks locaux

### Backend

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python scripts/smoke_check.py
```

### Frontend

```bash
cd frontend
npm ci
npm run build
```

## Standards

- prefere l'ASCII dans les fichiers sources
- documente les comportements visibles pour l'utilisateur
- si tu ajoutes une source de donnees, pense a la confidentialite et au nettoyage des exports
- si tu modifies le modele de donnees, mets a jour la doc dans `docs/`

## Pull requests

Une bonne pull request contient:

- le probleme vise
- la solution retenue
- les fichiers ou zones impactes
- la verification effectuee
