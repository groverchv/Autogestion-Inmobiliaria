@echo off
title Autogestion Inmobiliaria 360 - Frontend Corporativo SvelteKit
echo ========================================================
echo   Iniciando Frontend Corporativo en http://localhost:5174
echo   Sitio publico: http://localhost:5174
echo   Panel admin:   http://localhost:5174/admin
echo ========================================================
cd /d "%~dp0FrontendCorporativo"

if not exist "node_modules" (
    echo Instalando dependencias de Node.js...
    call npm install
)

npm run dev -- --host
pause
