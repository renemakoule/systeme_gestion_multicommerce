@echo off
echo ===================================================
echo   COMPILATION DOUBLE DE GASNEXUS
echo   (Client + SuperAdmin)
echo ===================================================

echo.
echo [1/4] Compilation du Frontend (Next.js) ...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERREUR] Echec de la compilation du frontend.
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/4] Compilation du Backend (Python/FastAPI) ...
cd backend
call venv\Scripts\activate.bat
REM Compilation via PyInstaller. On ajoute le dossier static et la database.
REM Si necessaire, ajustez les hidden-imports selon vos packages.
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
echo [3/4] Packaging Electron - Version CLIENT ...
call npm run electron-publish:client
if %errorlevel% neq 0 (
    echo [ERREUR] Echec du packaging Client.
    exit /b %errorlevel%
)

echo.
echo [4/4] Packaging Electron - Version SUPERADMIN ...
call npm run electron-publish:superadmin
if %errorlevel% neq 0 (
    echo [ERREUR] Echec du packaging SuperAdmin.
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo   SUCCES TOTAL ! 
echo   Les applications Client et SuperAdmin ont ete
echo   compilees et publiees. Verifiez le dossier 'dist/'.
echo ===================================================
pause
