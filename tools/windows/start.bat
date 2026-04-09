@echo off
setlocal

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
set "PROJECT_DIR=%ROOT_DIR%\finance_hub"
set "PYTHON_EXE=%PROJECT_DIR%\.venv\Scripts\python.exe"
set "APP_PORT=%~1"
set "APP_URL="
set "LOG_DIR=%PROJECT_DIR%\data\logs"

if not exist "%PROJECT_DIR%\backend\main.py" (
    echo [ERREUR] Projet introuvable: "%PROJECT_DIR%"
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo [ERREUR] Environnement Python manquant: "%PYTHON_EXE%"
    echo Lance d'abord le setup depuis:
    echo   tools\windows\setup.bat
    exit /b 1
)

if not exist "%PROJECT_DIR%\frontend\dist\index.html" (
    echo [ERREUR] Frontend build manquant dans "%PROJECT_DIR%\frontend\dist"
    echo Lance d'abord le setup depuis:
    echo   tools\windows\setup.bat
    exit /b 1
)

echo [INFO] Arret des anciens processus Finance Hub...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\tools\windows\stop_finance_hub.ps1" -ProjectDir "%PROJECT_DIR%"
if errorlevel 1 exit /b 1

if not defined APP_PORT (
    for /f %%p in ('powershell -NoProfile -Command "$port = 8000..8010 | Where-Object { -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue) } | Select-Object -First 1; if ($null -eq $port) { exit 1 }; Write-Output $port"') do set "APP_PORT=%%p"
)

if not defined APP_PORT (
    echo [ERREUR] Aucun port libre n'a ete trouve entre 8000 et 8010.
    exit /b 1
)

set "APP_URL=http://127.0.0.1:%APP_PORT%"

echo Lancement de Finance Hub depuis "%PROJECT_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul
powershell -NoProfile -Command "$stdout = '%LOG_DIR%\backend.stdout.log'; $stderr = '%LOG_DIR%\backend.stderr.log'; Start-Process -FilePath '%PYTHON_EXE%' -WorkingDirectory '%PROJECT_DIR%' -ArgumentList '-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','%APP_PORT%' -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null"
if errorlevel 1 exit /b 1

echo Application: %APP_URL%
echo Logs backend: %LOG_DIR%
