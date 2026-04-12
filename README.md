# Finance Hub Workspace

Ce depot est centre sur une seule application: `finance_hub`.

La racine est maintenant volontairement minimale:

- `FinanceHubDesktop.bat`: point d'entree principal
- `finance_hub/`: code produit
- `archive/`: anciens flux et fichiers legacy

## Demarrage recommande

Depuis cette racine:

```bat
FinanceHubDesktop.bat
```

Ce lanceur ouvre la version desktop locale de Finance Hub.

## Dossier principal

- `finance_hub/`: application locale `local-first`
- `finance_hub/frontend/src-tauri/`: wrapper desktop Tauri
- `finance_hub/docs/desktop-wrapper.md`: details du wrapper

## Legacy archive

Les anciens points d'entree backend/deploiement ont ete ranges dans:

- `archive/runtime_legacy/`

Le contenu personnel plus ancien reste dans:

- `archive/finance_hub_personal_legacy/`
- `archive/personal_assets/`
