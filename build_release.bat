@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   COMPILATION DOUBLE DE GASNEXUS
echo   (Client + SuperAdmin)
echo ===================================================

:: Chemin vers Inno Setup (à ajuster si nécessaire)
set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist %ISCC% (
    set ISCC="C:\Program Files (x86)\Inno Setup 5\ISCC.exe"
)

echo.
echo [1/6] Compilation du Frontend (Next.js) ...
cd frontend
if exist out rmdir /s /q out
call npm run build
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de la compilation du frontend.
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/6] Compilation du Backend (Python/FastAPI) ...
cd backend
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
pyinstaller --name main --onefile ^
    --add-data "static;static" ^
    --hidden-import "sqlmodel" ^
    --hidden-import "passlib.handlers.bcrypt" ^
    --hidden-import "multipart" ^
    --distpath dist main.py
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de la compilation du backend.
    exit /b %errorlevel%
)
cd ..

echo.
echo [3/6] Packaging Electron - Version CLIENT ...
call npm run electron-publish:client
if %errorlevel% neq 0 (
    echo [ERREUR] Echec du packaging Client.
    exit /b %errorlevel%
)

echo.
echo [4/6] Packaging Electron - Version SUPERADMIN ...
call npm run electron-publish:superadmin
if %errorlevel% neq 0 (
    echo [ERREUR] Echec du packaging SuperAdmin.
    exit /b %errorlevel%
)

echo.
echo [5/6] Generation de l'installateur Inno Setup (CLIENT) ...
if exist %ISCC% (
    %ISCC% setup_client.iss
) else (
    echo [ALERTE] Inno Setup non trouve. Compilation de l'installateur Client ignoree.
)

echo.
echo [6/6] Generation de l'installateur Inno Setup (SUPERADMIN) ...
if exist %ISCC% (
    %ISCC% setup_superadmin.iss
) else (
    echo [ALERTE] Inno Setup non trouve. Compilation de l'installateur SuperAdmin ignoree.
)

echo.
echo ===================================================
echo   SUCCES TOTAL ! 
echo   Les applications Client et SuperAdmin ont ete
echo   compilees et les installateurs generes.
echo   Verifiez le dossier 'dist/setup/'.
echo ===================================================
pause
