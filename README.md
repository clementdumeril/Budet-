# Finance Hub Workspace

Ce depot est maintenant centre sur une seule application utilisable: `finance_hub`.

Le contenu personnel et legacy a ete sorti du chemin principal dans `archive/` pour eviter les confusions au lancement.

## Demarrage rapide

Depuis cette racine:

```bat
setup.bat
start.bat
```

Version PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
powershell -ExecutionPolicy Bypass -File .\start.ps1
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

- lancer le setup
- lancer `finance_hub`
- documenter l'entree principale
