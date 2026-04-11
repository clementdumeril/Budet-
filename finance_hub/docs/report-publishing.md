# Publication de rapports statiques

Le mode recommande pour une utilisation personnelle est:

- application complete en local sur ton PC
- publication de snapshots statiques agregees vers un dossier cible
- site public ou dossier Drive qui ne recoit que le rapport, pas la base

## Pourquoi ce mode

- pas de backend public a maintenir
- pas de base Postgres qui expire
- pas d'acces distant a ton budget brut
- GitHub sert uniquement a distribuer l'application a installer en local

## Configuration

Ajoute ces variables dans `finance_hub/.env` si tu veux personnaliser la publication:

```env
REPORT_PUBLISH_DIR=./data/published-report
REPORT_TITLE=Finance Hub Report
REPORT_RECENT_MONTHS=6
REPORT_INCLUDE_TRANSACTIONS=false
```

`REPORT_PUBLISH_DIR` peut pointer vers:

- un dossier de ton site statique
- un dossier OneDrive / Google Drive synchronise
- ou simplement `./data/published-report` pour un usage local

Exemples:

```env
REPORT_PUBLISH_DIR=C:\Sites\portfolio\budget-report
```

```env
REPORT_PUBLISH_DIR=C:\Users\Toi\OneDrive\Budget Reports\latest
```

## Export manuel

Depuis la racine du depot:

```bat
PublishBudgetReport.bat
```

Le script genere:

- `index.html`
- `report.json`

dans le dossier cible.

Tu peux aussi forcer des options:

```bat
PublishBudgetReport.bat --title "Budget Clement" --months 4
```

Si tu veux inclure quelques transactions recentes dans le snapshot:

```bat
PublishBudgetReport.bat --include-transactions
```

## Export quotidien

Script fourni:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\windows\install_daily_report_task.ps1 -Time 07:30
```

Cela cree une tache Windows qui lance l'export tous les jours a l'heure choisie.

Si tu preferes une creation manuelle:

1. Ouvre le Planificateur de taches Windows
2. Cree une tache quotidienne
3. Programme `cmd.exe`
4. Arguments:

```text
/c "C:\chemin\vers\Budget\PublishBudgetReport.bat"
```

## Ce qui est publie

Par defaut, le rapport contient:

- KPIs globaux
- budget du mois `prevu vs reel`
- tendance mensuelle recente
- principales categories

Par defaut, les transactions detaillees ne sont pas publiees.

## GitHub

Le depot GitHub reste le point de distribution de l'application locale:

- toi: tu l'utilises en local et tu publies seulement un rapport statique
- les autres: ils clonent le repo et l'utilisent aussi en local
