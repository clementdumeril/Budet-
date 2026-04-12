@echo off
setlocal

for %%I in ("%~dp0.") do set "ROOT_DIR=%%~fI"
set "FRONTEND_DIR=%ROOT_DIR%\finance_hub\frontend"
set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
set "VSWHERE_EXE=C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"
set "VS_INSTALL="
set "VSDEV_CMD="

if not exist "%FRONTEND_DIR%\package.json" (
    echo [ERREUR] Frontend Finance Hub introuvable dans "%FRONTEND_DIR%"
    exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] npm.cmd est introuvable. Installe Node.js puis relance ce fichier.
    exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
    if exist "%CARGO_BIN%\cargo.exe" (
        set "PATH=%CARGO_BIN%;%PATH%"
    )
)

where cargo >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Rust/Cargo est introuvable. Installe rustup puis relance ce fichier.
    echo Commande recommandee:
    echo   winget install Rustlang.Rustup
    exit /b 1
)

if exist "%VSWHERE_EXE%" (
    for /f "usebackq delims=" %%I in (`"%VSWHERE_EXE%" -latest -products * -requires Microsoft.VisualStudio.Workload.VCTools -property installationPath`) do set "VS_INSTALL=%%I"
)

if defined VS_INSTALL if exist "%VS_INSTALL%\Common7\Tools\VsDevCmd.bat" (
    set "VSDEV_CMD=%VS_INSTALL%\Common7\Tools\VsDevCmd.bat"
)

if not defined VSDEV_CMD (
    echo [ERREUR] Les Build Tools Visual Studio C++ sont introuvables.
    echo Commande recommandee:
    echo   winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    exit /b 1
)

pushd "%FRONTEND_DIR%"
echo [INFO] Lancement du wrapper desktop Tauri...
call "%VSDEV_CMD%" -arch=x64 >nul
npm.cmd run desktop:dev
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
