$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
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

if (-not (Test-Path (Join-Path $frontendDir "node_modules\.bin\vite.cmd"))) {
    Write-Host "[INFO] Installation des dependances frontend"
    Push-Location $frontendDir
    try {
        & npm.cmd ci
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[INFO] Dependances frontend deja presentes"
}

$backendEnvExample = Join-Path $projectDir ".env.example"
$backendEnv = Join-Path $projectDir ".env"
if ((-not (Test-Path $backendEnv)) -and (Test-Path $backendEnvExample)) {
    Copy-Item $backendEnvExample $backendEnv
}

Write-Host "[INFO] Build du frontend statique"
Push-Location $frontendDir
try {
    & npm.cmd run build
} finally {
    Pop-Location
}

Write-Host "[OK] Setup termine."
Write-Host "Tu peux maintenant lancer:"
Write-Host "  .\FinanceHub.bat"
