@echo off
title FactLens Microservices Starter
REM ===========================================================================
REM Starts the four FastAPI services and, when Redis is running, one Celery
REM worker per analysis queue. Run setup_backend.bat once before first use.
REM
REM Without Redis the APIs run each scan inline (Celery eager mode). The scan
REM lifecycle is identical either way: PENDING is written first and the client
REM polls. /health on each service reports which mode is active.
REM ===========================================================================
cd /d "%~dp0"
set "ROOT=%~dp0"
set "PYTHONPATH=%ROOT%services\shared"
set "MODEL_REGISTRY_PATH=%ROOT%models\registry.json"
REM ScamNet-BN: one ensemble member on this PC (~2.3 GB RAM), CPU, offline config.
set "SCAMNET_MODEL_DIR=%ROOT%models\scamnet"
set "SCAMNET_MAX_MODELS=1"
set "SCAMNET_DEVICE=cpu"
set "SCAMNET_TIMEOUT_SECONDS=10"
REM BanglaVerify v2 (Rumor Scanner): BanglaBERT, ~1 GB RAM, CPU.
set "BANGLAVERIFY_MODEL_DIR=%ROOT%models\banglaverify"
set "BANGLAVERIFY_DEVICE=cpu"
set "BANGLAVERIFY_TIMEOUT_SECONDS=10"
set "HF_HUB_OFFLINE=1"
set "TRANSFORMERS_OFFLINE=1"

echo ===================================================================
echo  Identity ^& Profile   http://127.0.0.1:8001/docs
echo  Rumor Scanner        http://127.0.0.1:8002/docs
echo  Scam Alert           http://127.0.0.1:8003/docs
echo  Image Check          http://127.0.0.1:8004/docs
echo ===================================================================

start "Identity (8001)" cmd /k "cd /d %ROOT%services\identity-service && py -m uvicorn src.main:app --host 127.0.0.1 --port 8001 --reload"
start "Rumor Scanner (8002)" cmd /k "cd /d %ROOT%services\rumour-service && py -m uvicorn src.main:app --host 127.0.0.1 --port 8002 --reload"
start "Scam Alert (8003)" cmd /k "cd /d %ROOT%services\scam-service && py -m uvicorn src.main:app --host 127.0.0.1 --port 8003 --reload"
start "Image Check (8004)" cmd /k "cd /d %ROOT%services\image-service && py -m uvicorn src.main:app --host 127.0.0.1 --port 8004 --reload"

REM --- Celery workers, only when Redis answers -------------------------------
py -c "import redis,sys; redis.Redis.from_url('redis://localhost:6379/0', socket_connect_timeout=1).ping()" >nul 2>&1
if errorlevel 1 (
    echo.
    echo Redis is not running: skipping Celery workers. Scans will run inline.
) else (
    echo.
    echo Redis detected: starting Celery workers ^(--pool=solo is required on Windows^).
    start "Rumor worker" cmd /k "cd /d %ROOT%services\rumour-service && py -m celery -A src.workers.tasks.celery_app worker --pool=solo --queues=rumor --loglevel=info"
    start "Scam worker" cmd /k "cd /d %ROOT%services\scam-service && py -m celery -A src.workers.tasks.celery_app worker --pool=solo --queues=scam --loglevel=info"
    start "Image worker" cmd /k "cd /d %ROOT%services\image-service && py -m celery -A src.workers.tasks.celery_app worker --pool=solo --queues=image --loglevel=info -B"
)

echo.
echo Services launched in separate terminals.
echo.
