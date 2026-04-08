@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "PROJECT_DIR=%ROOT_DIR%finance_hub"
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"
set "PYTHON_EXE=%PROJECT_DIR%\.venv\Scripts\python.exe"

if not exist "%PROJECT_DIR%\backend\main.py" (
    echo [ERREUR] Projet introuvable: "%PROJECT_DIR%"
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo [ERREUR] Environnement Python manquant: "%PYTHON_EXE%"
    echo Cree d'abord le venv et installe les dependances backend:
    echo   cd /d "%PROJECT_DIR%"
    echo   python -m venv .venv
    echo   .venv\Scripts\python -m pip install -r requirements.txt
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [ERREUR] Dependances frontend manquantes dans "%FRONTEND_DIR%\node_modules"
    echo Installe-les d'abord:
    echo   cd /d "%FRONTEND_DIR%"
    echo   npm.cmd ci
    exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] npm.cmd est introuvable dans le PATH.
    echo Installe Node.js puis relance ce script.
    exit /b 1
)

echo Lancement de Finance Hub depuis "%PROJECT_DIR%"
start "Finance Hub Backend" cmd /k "cd /d ""%PROJECT_DIR%"" && ""%PYTHON_EXE%"" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"
start "Finance Hub Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm.cmd run dev"

echo Backend:  http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:5173
echo Deux fenetres ont ete ouvertes.
