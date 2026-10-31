@echo off
title FactLens Backend Setup
REM ===========================================================================
REM One-time setup: installs every service's Python dependencies and the
REM shared factlens_common library (editable, so edits apply immediately).
REM Run from anywhere; paths are resolved relative to this file.
REM ===========================================================================
cd /d "%~dp0"

echo [1/5] Shared library (factlens_common)
py -m pip install -e services\shared || goto :fail

echo [2/5] Identity service
py -m pip install -r services\identity-service\requirements.txt || goto :fail

echo [3/5] Rumor Scanner service
py -m pip install -r services\rumour-service\requirements.txt || goto :fail

echo [4/5] Scam Alert service
py -m pip install -r services\scam-service\requirements.txt || goto :fail

echo [5/5] Image Check service
py -m pip install -r services\image-service\requirements.txt || goto :fail

echo.
echo Backend dependencies installed.
echo Optional: start Redis for asynchronous processing ^(docker run -p 6379:6379 redis:7-alpine^).
echo Without Redis the APIs run scans inline ^(Celery eager mode^) and report it in /health.
echo.
pause
exit /b 0

:fail
echo.
echo Setup failed. Read the error above, fix it, and run this script again.
pause
exit /b 1
