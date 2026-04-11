@echo off
setlocal

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
set "PROJECT_DIR=%ROOT_DIR%\finance_hub"
set "PYTHON_EXE=%PROJECT_DIR%\.venv\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [ERREUR] Environnement Python manquant: "%PYTHON_EXE%"
    echo Lance d'abord:
    echo   FinanceHub.bat
    echo ou tools\windows\setup.bat
    exit /b 1
)

if not exist "%PROJECT_DIR%\.env" if exist "%PROJECT_DIR%\.env.example" (
    copy /y "%PROJECT_DIR%\.env.example" "%PROJECT_DIR%\.env" >nul
)

echo [INFO] Generation du rapport statique...
"%PYTHON_EXE%" "%PROJECT_DIR%\scripts\export_report.py" %*
if errorlevel 1 exit /b 1

echo [OK] Rapport publie.
