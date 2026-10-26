@echo off
title Autogestion Inmobiliaria 360 - Lanzador Completo Local
echo ========================================================
echo   Iniciando Backend y Frontend en paralelo
echo ========================================================

start "Backend Django" "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "Frontend Web" "%~dp0run_frontend.bat"

echo.
echo ========================================================
echo   Servicios lanzados:
echo   - Backend:  http://localhost:8000/api
echo   - Frontend: http://localhost:5173
echo ========================================================
