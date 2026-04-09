@echo off
setlocal

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
set "PROJECT_DIR=%ROOT_DIR%\finance_hub"
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"
set "VENV_DIR=%PROJECT_DIR%\.venv"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
set "PYTHON_CMD="

if not exist "%PROJECT_DIR%\backend\main.py" (
    echo [ERREUR] Projet Finance Hub introuvable dans "%PROJECT_DIR%"
    exit /b 1
)

where py >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3"

if not defined PYTHON_CMD (
    where python >nul 2>nul
    if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    echo [ERREUR] Python est introuvable. Installe Python 3 puis relance ce script.
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo [INFO] Creation du venv dans "%VENV_DIR%"
    %PYTHON_CMD% -m venv "%VENV_DIR%"
    if errorlevel 1 exit /b 1
)

echo [INFO] Installation des dependances backend
"%PYTHON_EXE%" -m pip install --upgrade pip
if errorlevel 1 exit /b 1
"%PYTHON_EXE%" -m pip install -r "%PROJECT_DIR%\requirements.txt"
if errorlevel 1 exit /b 1

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] npm.cmd est introuvable dans le PATH. Installe Node.js puis relance ce script.
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules\.bin\vite.cmd" (
    echo [INFO] Installation des dependances frontend
    pushd "%FRONTEND_DIR%"
    npm.cmd ci
    if errorlevel 1 (
        popd
        exit /b 1
    )
    popd
) else (
    echo [INFO] Dependances frontend deja presentes
)

if not exist "%PROJECT_DIR%\.env" if exist "%PROJECT_DIR%\.env.example" (
    copy /y "%PROJECT_DIR%\.env.example" "%PROJECT_DIR%\.env" >nul
)

echo [INFO] Build du frontend statique
pushd "%FRONTEND_DIR%"
npm.cmd run build
if errorlevel 1 (
    popd
    exit /b 1
)
popd

echo [OK] Setup termine.
echo Tu peux maintenant lancer:
echo   FinanceHub.bat
