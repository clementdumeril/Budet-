param(
    [int]$Port = 0
)

$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$projectDir = Join-Path $rootDir "finance_hub"
$pythonExe = Join-Path $projectDir ".venv\Scripts\python.exe"
$logDir = Join-Path $projectDir "data\logs"

if (-not (Test-Path (Join-Path $projectDir "backend\main.py"))) {
    Write-Error "Projet introuvable: $projectDir"
}

if (-not (Test-Path $pythonExe)) {
    Write-Error @"
Environnement Python manquant: $pythonExe
Lance d'abord le setup depuis:
  .\tools\windows\setup.ps1
"@
}

if (-not (Test-Path (Join-Path $projectDir "frontend\dist\index.html"))) {
    Write-Error @"
Frontend build manquant dans: $projectDir\frontend\dist
Lance d'abord le setup depuis:
  .\tools\windows\setup.ps1
"@
}

& (Join-Path $rootDir "tools\windows\stop_finance_hub.ps1") -ProjectDir $projectDir

if ($Port -eq 0) {
    $Port = 8000..8010 | Where-Object { -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue) } | Select-Object -First 1
}

if ($null -eq $Port) {
    Write-Error "Aucun port libre n'a ete trouve entre 8000 et 8010."
}

$appUrl = "http://127.0.0.1:$Port"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
Start-Process -FilePath $pythonExe -WorkingDirectory $projectDir -ArgumentList "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "$Port" -RedirectStandardOutput (Join-Path $logDir "backend.stdout.log") -RedirectStandardError (Join-Path $logDir "backend.stderr.log") | Out-Null

Write-Host "Lancement de Finance Hub depuis $projectDir"
Write-Host "Application : $appUrl"
Write-Host "Logs backend : $logDir"
