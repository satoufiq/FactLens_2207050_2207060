<#
  FactLens - check ScamNet-BN working inside the website.

  Run with VS Code closed (it holds ~2.7 GB): the model needs ~3.6 GB once
  loaded and ~4 GB while loading. Started by check_scamnet_website.bat.

  1. checks free memory
  2. starts Identity (8001) and Scam Alert (8003); Scam Alert loads the model
  3. waits until the model is loaded, then runs scripts/check_live.py
  4. starts the website (5173) and opens the Scam Alert page
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "FactLens - ScamNet-BN website check"

function Section($text) { Write-Host ""; Write-Host "== $text ==" -ForegroundColor Cyan }

# -- 1. memory ----------------------------------------------------------------
Section "1/4  Free memory"
$os = Get-CimInstance Win32_OperatingSystem
$freeCommit = $os.FreeVirtualMemory / 1MB
$freeRam = $os.FreePhysicalMemory / 1MB
Write-Host ("free RAM {0:N1} GB, free commit {1:N1} GB (the model needs about 4 GB while loading)" -f $freeRam, $freeCommit)
if ($freeCommit -lt 4.5) {
    Write-Host "Not enough free memory. These use the most right now:" -ForegroundColor Yellow
    Get-Process | Group-Object Name | ForEach-Object {
        [pscustomobject]@{ App = $_.Name; GB = [math]::Round((($_.Group | Measure-Object PrivateMemorySize64 -Sum).Sum) / 1GB, 2) }
    } | Sort-Object GB -Descending | Select-Object -First 6 | Format-Table -AutoSize | Out-Host
    Write-Host "Close some of them (VS Code especially), then press Enter. Type 'go' to try anyway." -ForegroundColor Yellow
    $answer = Read-Host
    if ($answer -ne "go") {
        $freeCommit = (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB
        Write-Host ("free commit now {0:N1} GB" -f $freeCommit)
    }
}

# -- 2. services --------------------------------------------------------------
Section "2/4  Starting Identity and Scam Alert"
$env:PYTHONPATH = Join-Path $Root "services\shared"
$env:MODEL_REGISTRY_PATH = Join-Path $Root "models\registry.json"
$env:SCAMNET_MODEL_DIR = Join-Path $Root "models\scamnet"
$env:SCAMNET_DEVICE = "cpu"
$env:SCAMNET_MAX_MODELS = "1"
$env:SCAMNET_TIMEOUT_SECONDS = "10"
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"

foreach ($port in 8001, 8003, 5173) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "Port $port is already in use. Close the old FactLens windows first, then run this again." -ForegroundColor Red
        Read-Host "Press Enter to exit"; exit 1
    }
}

Start-Process cmd -ArgumentList "/k", "title Identity (8001) && cd /d `"$Root\services\identity-service`" && py -m uvicorn src.main:app --host 127.0.0.1 --port 8001"
Start-Process cmd -ArgumentList "/k", "title Scam Alert + ScamNet-BN (8003) && cd /d `"$Root\services\scam-service`" && py -m uvicorn src.main:app --host 127.0.0.1 --port 8003"

Write-Host "Scam Alert is loading ScamNet-BN (1-5 minutes on this PC; watch its window)..."
$deadline = (Get-Date).AddMinutes(10)
$health = $null
while ((Get-Date) -lt $deadline) {
    try { $health = Invoke-RestMethod "http://127.0.0.1:8003/health" -TimeoutSec 5; break }
    catch { Start-Sleep -Seconds 3; Write-Host -NoNewline "." }
}
Write-Host ""
if (-not $health) {
    Write-Host "Scam Alert did not start within 10 minutes. Read the 'Scam Alert' window for the error." -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit 1
}
if (-not $health.model.available) {
    Write-Host "Scam Alert is running WITHOUT the model:" -ForegroundColor Red
    Write-Host "  $($health.model.last_error)" -ForegroundColor Red
    Write-Host "Scans will still work (rules + URL analysis, marked PARTIAL). Free more memory and run again." -ForegroundColor Yellow
} else {
    $w = $health.model.worker_status
    Write-Host ("ScamNet-BN {0} loaded in {1:N1}s (warm-up {2} ms)" -f $health.model.version, ($w.load_ms / 1000), $w.warmup_ms) -ForegroundColor Green
}

# -- 3. live check ------------------------------------------------------------
Section "3/4  Live check through the API"
py (Join-Path $Root "services\scam-service\scripts\check_live.py")
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
Write-Host "Then   : Scam Alert in the sidebar -> paste a message -> Analyze"
Write-Host ""
Write-Host "Try these:"
Write-Host "  Apnar bKash account block hoye jabe. Ekhoni OTP 4821 pathan 01712345678 number e.   -> High risk, smish"
Write-Host "  Grameenphone: 30GB internet mattro 299 takay! Dial *121*3#                         -> Promotional message"
Write-Host "  Meeting moved to 4pm tomorrow in room 302.                                         -> Low risk"
Write-Host ""
Write-Host "On the result page look for the 'ScamNet-BN model verdict' panel (class, probabilities,"
Write-Host "version). If the model was not used, a yellow 'Partial result' notice says why."
Write-Host ""
if ($checkOk) { Write-Host "Live check: ALL CHECKS PASSED" -ForegroundColor Green }
else { Write-Host "Live check reported problems - see scamnet_check_report.txt" -ForegroundColor Yellow }
Write-Host "Report: $Root\scamnet_check_report.txt"
Write-Host "Close the three service windows when you are done."
Read-Host "Press Enter to close this window"
