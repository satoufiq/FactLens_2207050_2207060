@echo off
title FactLens Full Stack Starter
REM Backend services (and workers, when Redis is running) plus the Vite frontend.
REM Run setup_backend.bat once before first use.
cd /d "%~dp0"

call "%~dp0run_microservices.bat"

start "FactLens Frontend (5173)" cmd /k "cd /d %~dp0 && npm.cmd run dev"

echo Frontend: http://localhost:5173
echo.
pause
