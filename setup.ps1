$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Join-Path $rootDir "finance_hub"
$frontendDir = Join-Path $projectDir "frontend"
$venvDir = Join-Path $projectDir ".venv"
$pythonExe = Join-Path $venvDir "Scripts\python.exe"

if (-not (Test-Path (Join-Path $projectDir "backend\main.py"))) {
    Write-Error "Projet Finance Hub introuvable: $projectDir"
}

$pythonCommand = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCommand = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCommand = "python"
}

if ($null -eq $pythonCommand) {
    Write-Error "Python est introuvable. Installe Python 3 puis relance ce script."
}

if (-not (Test-Path $pythonExe)) {
    Write-Host "[INFO] Creation du venv dans $venvDir"
    if ($pythonCommand -eq "py") {
        & py -3 -m venv $venvDir
    } else {
        & python -m venv $venvDir
    }
}

Write-Host "[INFO] Installation des dependances backend"
& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r (Join-Path $projectDir "requirements.txt")

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Write-Error "npm.cmd est introuvable dans le PATH. Installe Node.js puis relance ce script."
}

Write-Host "[INFO] Installation des dependances frontend"
Push-Location $frontendDir
try {
    & npm.cmd ci
} finally {
    Pop-Location
}

$backendEnvExample = Join-Path $projectDir ".env.example"
$backendEnv = Join-Path $projectDir ".env"
if ((-not (Test-Path $backendEnv)) -and (Test-Path $backendEnvExample)) {
    Copy-Item $backendEnvExample $backendEnv
}

$frontendEnvExample = Join-Path $frontendDir ".env.example"
$frontendEnv = Join-Path $frontendDir ".env"
if ((-not (Test-Path $frontendEnv)) -and (Test-Path $frontendEnvExample)) {
    Copy-Item $frontendEnvExample $frontendEnv
}

Write-Host "[OK] Setup termine."
Write-Host "Tu peux maintenant lancer:"
Write-Host "  .\\start.ps1"
