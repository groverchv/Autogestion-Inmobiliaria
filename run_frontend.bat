@echo off
title Autogestion Inmobiliaria 360 - Frontend Web Vite
echo ========================================================
echo   Iniciando Frontend Web en http://localhost:5173
echo ========================================================
cd /d "%~dp0Frontend"

if not exist "node_modules" (
    echo Instalando dependencias de Node.js...
    call npm install
)

npm run dev -- --host
pause
