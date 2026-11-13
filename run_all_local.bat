@echo off
title Autogestion Inmobiliaria 360 - Lanzador Completo Local
echo ========================================================
echo   Iniciando todos los servicios en paralelo
echo ========================================================

start "Backend Django" "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "Frontend Web" "%~dp0run_frontend.bat"
timeout /t 2 /nobreak >nul
start "Backend Corporativo" "%~dp0run_corporativo_backend.bat"
timeout /t 2 /nobreak >nul
start "Frontend Corporativo" "%~dp0run_corporativo_frontend.bat"

echo.
echo ========================================================
echo   Servicios lanzados:
echo   - Backend (API):          http://localhost:8000/api
echo   - App Web (operativa):    http://localhost:5173
echo   - Backend Corporativo:    http://localhost:8081
echo   - Sitio Corporativo:      http://localhost:5174
echo   - Panel Corporativo:      http://localhost:5174/admin
echo   - Swagger Corporativo:    http://localhost:8081/swagger-ui.html
echo ========================================================
