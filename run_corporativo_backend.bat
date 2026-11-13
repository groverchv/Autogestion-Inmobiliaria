@echo off
title Autogestion Inmobiliaria 360 - Backend Corporativo Spring Boot
echo ========================================================
echo   Iniciando Backend Corporativo en http://localhost:8081
echo   Swagger UI: http://localhost:8081/swagger-ui.html
echo ========================================================
cd /d "%~dp0BackendCorporativo"

if not exist ".env" (
    echo [ERROR] No se encontro BackendCorporativo\.env
    echo Copia .env.example a .env y completa las variables.
    pause
    exit /b 1
)

set "MVN=mvn"
where mvn >nul 2>nul
if errorlevel 1 (
    if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2025.3.1.1\plugins\maven\lib\maven3\bin\mvn.cmd" (
        set "MVN=C:\Program Files\JetBrains\IntelliJ IDEA 2025.3.1.1\plugins\maven\lib\maven3\bin\mvn.cmd"
    ) else (
        echo [ERROR] No se encontro Maven. Instala Maven o ajusta la ruta en este script.
        pause
        exit /b 1
    )
)

call "%MVN%" spring-boot:run -Dspring-boot.run.jvmArguments="-Dfile.encoding=UTF-8"
pause
