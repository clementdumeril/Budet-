@echo off
setlocal

for %%I in ("%~dp0.") do set "ROOT_DIR=%%~fI"
set "TOOLS_DIR=%ROOT_DIR%\tools\windows"
set "PROJECT_DIR=%ROOT_DIR%\finance_hub"
set "VENV_DIR=%PROJECT_DIR%\.venv"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
set "APP_PORT="
set "BACKEND_URL="
set "APP_URL="
set "PYTHON_CMD="

if not exist "%PROJECT_DIR%\backend\main.py" (
    echo [ERREUR] Projet Finance Hub introuvable dans "%PROJECT_DIR%"
    exit /b 1
)

if not exist "%TOOLS_DIR%\setup.bat" (
    echo [ERREUR] Outils de lancement introuvables dans "%TOOLS_DIR%"
    exit /b 1
)

where py >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3"

if not defined PYTHON_CMD (
    where python >nul 2>nul
    if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    echo [ERREUR] Python 3 est introuvable. Installe Python puis relance ce fichier.
    exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] npm.cmd est introuvable. Installe Node.js puis relance ce fichier.
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo [INFO] Creation du venv...
    %PYTHON_CMD% -m venv "%VENV_DIR%"
    if errorlevel 1 exit /b 1
)

if not exist "%PROJECT_DIR%\.env" if exist "%PROJECT_DIR%\.env.example" (
    copy /y "%PROJECT_DIR%\.env.example" "%PROJECT_DIR%\.env" >nul
)

call "%TOOLS_DIR%\setup.bat"
if errorlevel 1 (
    echo [ERREUR] Le setup a echoue.
    exit /b 1
)

echo [INFO] Arret des anciens processus Finance Hub...
powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOLS_DIR%\stop_finance_hub.ps1" -ProjectDir "%PROJECT_DIR%"
if errorlevel 1 (
    echo [ERREUR] Impossible de nettoyer les anciens processus Finance Hub.
    exit /b 1
)

for /f %%p in ('powershell -NoProfile -Command "$port = 8000..8010 | Where-Object { -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue) } | Select-Object -First 1; if ($null -eq $port) { exit 1 }; Write-Output $port"') do set "APP_PORT=%%p"
if not defined APP_PORT (
    echo [ERREUR] Aucun port libre n'a ete trouve entre 8000 et 8010.
    exit /b 1
)

set "BACKEND_URL=http://127.0.0.1:%APP_PORT%/api/health"
set "APP_URL=http://127.0.0.1:%APP_PORT%"

echo [INFO] Demarrage du backend...
call "%TOOLS_DIR%\start.bat" %APP_PORT%
if errorlevel 1 exit /b 1

set "BACKEND_READY="
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing '%BACKEND_URL%' | Out-Null; exit 0 } catch { exit 1 }"
    if not errorlevel 1 (
        set "BACKEND_READY=1"
        goto :backend_ready
    )
    timeout /t 1 /nobreak >nul
)

:backend_ready
if not defined BACKEND_READY (
    echo [ERREUR] Le backend ne repond pas sur http://127.0.0.1:8000
    echo Verifie la fenetre "Finance Hub Backend".
    exit /b 1
)

set "APP_READY="
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing '%APP_URL%'; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    if not errorlevel 1 (
        set "APP_READY=1"
        goto :app_ready
    )
    timeout /t 1 /nobreak >nul
)

:app_ready
if not defined APP_READY (
    echo [ERREUR] L'interface ne repond pas sur %APP_URL%
    echo Verifie la fenetre "Finance Hub Backend".
    exit /b 1
)

echo [OK] Finance Hub est pret.
echo Backend  : %BACKEND_URL%
echo Interface : %APP_URL%
start "" "%APP_URL%"
