$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Join-Path $rootDir "finance_hub"
$frontendDir = Join-Path $projectDir "frontend"
$pythonExe = Join-Path $projectDir ".venv\Scripts\python.exe"

if (-not (Test-Path (Join-Path $projectDir "backend\main.py"))) {
    Write-Error "Projet introuvable: $projectDir"
}

if (-not (Test-Path $pythonExe)) {
    Write-Error @"
Environnement Python manquant: $pythonExe
Lance d'abord le setup depuis cette racine:
  .\setup.ps1
"@
}

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Error @"
Dependances frontend manquantes dans: $frontendDir\node_modules
Lance d'abord le setup depuis cette racine:
  .\setup.ps1
"@
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Write-Error "npm.cmd est introuvable dans le PATH. Installe Node.js puis relance ce script."
}

$backendCommand = "cd /d `"$projectDir`" && `"$pythonExe`" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"
$frontendCommand = "cd /d `"$frontendDir`" && npm.cmd run dev"

Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCommand | Out-Null
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCommand | Out-Null

Write-Host "Lancement de Finance Hub depuis $projectDir"
Write-Host "Backend :  http://127.0.0.1:8000"
Write-Host "Frontend : http://127.0.0.1:5173"
Write-Host "Deux fenetres ont ete ouvertes."
