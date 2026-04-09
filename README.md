# Finance Hub Workspace

Ce depot est maintenant centre sur une seule application utilisable: `finance_hub`.

Le contenu personnel et legacy a ete sorti du chemin principal dans `archive/` pour eviter les confusions au lancement.

## Demarrage rapide

Depuis cette racine:

```bat
FinanceHub.bat
```

Ce lanceur unique:

- prepare l'environnement si besoin
- build le frontend
- coupe les anciens serveurs Finance Hub encore ouverts
- lance le backend unique sur `8000` ou sur le prochain port libre
- ouvre l'application dans le navigateur

Les logs backend sont ecrits dans `finance_hub/data/logs/`.

Scripts techniques secondaires:

- `tools/windows/setup.bat`
- `tools/windows/start.bat`

Version PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\windows\setup.ps1
powershell -ExecutionPolicy Bypass -File .\tools\windows\start.ps1
```

## Parcours officiel

- `finance_hub/`: application principale a utiliser
- `archive/finance_hub_personal_legacy/`: ancienne variante personnelle, sortie du flux principal
- `archive/personal_assets/`: anciens fichiers perso de travail, hors du produit principal

## Connexion locale par defaut

- email: `demo@financehub.local`
- mot de passe: `demo1234`

## Objectif de la racine

La racine sert uniquement a:

- lancer Finance Hub en un clic
- garder un point d'entree minimal
- documenter l'entree principale
