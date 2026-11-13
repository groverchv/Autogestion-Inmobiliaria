@echo off
title Autogestion Inmobiliaria 360 - Lanzador Corporativo
echo ========================================================
echo   Iniciando SOLO el modulo corporativo (independiente)
echo   No requiere el backend Django ni la app React.
echo ========================================================

start "Backend Corporativo" "%~dp0run_corporativo_backend.bat"
timeout /t 3 /nobreak >nul
start "Frontend Corporativo" "%~dp0run_corporativo_frontend.bat"

echo.
echo ========================================================
echo   Servicios lanzados:
echo   - Backend Corporativo: http://localhost:8081
echo   - Sitio Corporativo:   http://localhost:5174
echo   - Panel admin:         http://localhost:5174/admin
echo   - Swagger:             http://localhost:8081/swagger-ui.html
echo ========================================================
