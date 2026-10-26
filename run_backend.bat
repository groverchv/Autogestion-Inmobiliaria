@echo off
title Autogestion Inmobiliaria 360 - Backend Django
echo ========================================================
echo   Iniciando Backend Django en http://0.0.0.0:8000
echo ========================================================
cd /d "%~dp0Backend"

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] No se encontro el entorno virtual en Backend\venv
    pause
    exit /b 1
)

echo Verificando migraciones de base de datos...
venv\Scripts\python.exe manage.py migrate --noinput

echo Iniciando servidor de desarrollo...
venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
pause
