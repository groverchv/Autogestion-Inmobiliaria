@echo off
title Autogestion Inmobiliaria 360 - Movil Flutter
echo ========================================================
echo   Iniciando App Movil Flutter
echo ========================================================
cd /d "%~dp0Movil"

echo Dispositivos detectados:
call flutter devices

echo.
echo Ejecutando con host de desarrollo local: 192.168.0.16
call flutter run --dart-define=API_HOST=192.168.0.16
pause
