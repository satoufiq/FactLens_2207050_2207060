<#
  FactLens - check BanglaVerify working inside the website (Rumor Scanner).

  BanglaVerify needs about 1.5 GB of free memory, so VS Code can stay open.
  Started by check_banglaverify_website.bat.

  1. checks free memory and that the ports are free
  2. starts Identity (8001) and the Rumor Scanner (8002), which loads the model
     (plus a Celery worker when Redis is running)
  3. waits until the model is loaded, then runs the live check
  4. starts the website (5173) and opens it
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "FactLens - BanglaVerify website check"

function Section($text) { Write-Host ""; Write-Host "== $text ==" -ForegroundColor Cyan }

# -- 1. memory and ports ------------------------------------------------------
Section "1/4  Free memory and ports"
$os = Get-CimInstance Win32_OperatingSystem
$freeCommit = $os.FreeVirtualMemory / 1MB
Write-Host ("free RAM {0:N1} GB, free commit {1:N1} GB (BanglaVerify needs about 1.5 GB)" -f ($os.FreePhysicalMemory / 1MB), $freeCommit)
if ($freeCommit -lt 2.0) {
    Write-Host "Memory is low. Close a few apps, then press Enter." -ForegroundColor Yellow
    Read-Host | Out-Null
}
foreach ($port in 8001, 8002, 5173) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "Port $port is already in use. Close the old FactLens windows first, then run this again." -ForegroundColor Red
        Read-Host "Press Enter to exit"; exit 1
    }
}

# -- 2. services --------------------------------------------------------------
Section "2/4  Starting Identity and the Rumor Scanner"
$env:PYTHONPATH = Join-Path $Root "services\shared"
$env:MODEL_REGISTRY_PATH = Join-Path $Root "models\registry.json"
$env:BANGLAVERIFY_MODEL_DIR = Join-Path $Root "models\banglaverify"
$env:BANGLAVERIFY_DEVICE = "cpu"
$env:BANGLAVERIFY_TIMEOUT_SECONDS = "10"
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"

Start-Process cmd -ArgumentList "/k", "title Identity (8001) && cd /d `"$Root\services\identity-service`" && py -m uvicorn src.main:app --host 127.0.0.1 --port 8001"
Start-Process cmd -ArgumentList "/k", "title Rumor Scanner + BanglaVerify (8002) && cd /d `"$Root\services\rumour-service`" && py -m uvicorn src.main:app --host 127.0.0.1 --port 8002"

Write-Host "Starting the Rumor Scanner (under a minute)..."
$deadline = (Get-Date).AddMinutes(5)
$health = $null
while ((Get-Date) -lt $deadline) {
    try { $health = Invoke-RestMethod "http://127.0.0.1:8002/health" -TimeoutSec 5; break }
    catch { Start-Sleep -Seconds 3; Write-Host -NoNewline "." }
}
Write-Host ""
if (-not $health) {
    Write-Host "The Rumor Scanner did not start. Read its window for the error." -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit 1
}

if ($health.queue.async) {
    # Redis is running, so scans go to a Celery worker; the worker holds the model.
    Write-Host "Redis is running: starting a Rumor worker, which loads BanglaVerify..."
    Start-Process cmd -ArgumentList "/k", "title Rumor worker + BanglaVerify && cd /d `"$Root\services\rumour-service`" && py -m celery -A src.workers.tasks.celery_app worker --pool=solo --queues=rumor --loglevel=info"
    $deadline = (Get-Date).AddMinutes(5)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3; Write-Host -NoNewline "."
        try { $health = Invoke-RestMethod "http://127.0.0.1:8002/health" -TimeoutSec 5 } catch { continue }
        if ($health.model.available) { break }
    }
    Write-Host ""
}

if (-not $health.model.available) {
    Write-Host "The Rumor Scanner is running WITHOUT the model:" -ForegroundColor Red
    Write-Host "  $($health.model.reason)" -ForegroundColor Red
    Write-Host "Scans still work on the evidence pipeline alone, marked PARTIAL." -ForegroundColor Yellow
} else {
    Write-Host ("BanglaVerify {0} loaded" -f $health.model.version) -ForegroundColor Green
}

# -- 3. live check ------------------------------------------------------------
Section "3/4  Live check through the API (each scan also searches the web: ~10-60 s each)"
py (Join-Path $Root "services\rumour-service\scripts\check_live.py")
$checkOk = ($LASTEXITCODE -eq 0)

# -- 4. website ---------------------------------------------------------------
Section "4/4  Starting the website"
Start-Process cmd -ArgumentList "/k", "title FactLens website (5173) && cd /d `"$Root`" && npm.cmd run dev"
$deadline = (Get-Date).AddMinutes(2)
while ((Get-Date) -lt $deadline) {
    try { Invoke-WebRequest "http://localhost:5173/" -UseBasicParsing -TimeoutSec 3 | Out-Null; break } catch { Start-Sleep 2 }
}
Start-Process "http://localhost:5173/login"

Write-Host ""
Write-Host "Website: http://localhost:5173  (opened in your browser)" -ForegroundColor Green
Write-Host "Log in : analyst@factlens.gov.bd  /  Password@123"
Write-Host "Then   : Rumor Scanner in the sidebar -> paste a claim -> Verify"
Write-Host ""
Write-Host "On the result page the 'BANGLAVERIFY v2' card shows the model's call (Fake-news pattern /"
Write-Host "Reads as genuine reporting), its confidence, and the fake probability against the threshold."
Write-Host "Evidence always outranks the model: the model only decides between 'Unverified' and"
Write-Host "'Unverified - suspicious pattern' when no evidence is found."
Write-Host ""
if ($checkOk) { Write-Host "Live check: ALL CHECKS PASSED" -ForegroundColor Green }
else { Write-Host "Live check reported problems - see banglaverify_check_report.txt" -ForegroundColor Yellow }
Write-Host "Report: $Root\banglaverify_check_report.txt"
Write-Host "Close the service windows when you are done."
Read-Host "Press Enter to close this window"
