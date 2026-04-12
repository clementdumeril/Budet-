# Wrapper desktop Tauri

## Objectif

Le wrapper Tauri transforme Finance Hub en application Windows locale:

- fenetre dediee au lieu d'un onglet navigateur
- vrai point d'entree desktop
- base technique pour une future sauvegarde disque et une publication hebdo automatisee
- meilleure impression produit au lancement

## Structure ajoutee

- `frontend/src-tauri/`: projet Rust/Tauri
- `../FinanceHubDesktop.bat`: lanceur Windows desktop
- `frontend/public/manifest.webmanifest`: mode installable web

## Prerequis Windows

1. Node.js
2. Rust via `rustup`
3. Build Tools Windows si Tauri les demande sur la machine

Installation Rust recommandee:

```powershell
winget install Rustlang.Rustup
```

## Installation frontend desktop

Depuis `finance_hub/frontend`:

```bat
npm install
```

Cela doit installer la CLI `@tauri-apps/cli`.

## Lancement desktop

Depuis la racine:

```bat
FinanceHubDesktop.bat
```

Ou depuis `finance_hub/frontend`:

```bat
npm run desktop:dev
```

## Build desktop

Depuis `finance_hub/frontend`:

```bat
npm run desktop:build
```

## Etat actuel

Le wrapper Tauri est en place comme socle. La prochaine etape utile cote desktop est:

- sortir la persistence du `localStorage` vers un fichier gere par l'app desktop
- brancher une commande desktop pour publier automatiquement le snapshot hebdomadaire
- produire de vraies icones de bundle Windows
