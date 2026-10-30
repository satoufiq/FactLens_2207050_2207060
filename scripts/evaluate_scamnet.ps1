<#
  FactLens - measure how well ScamNet-BN detects scams through the website.

  Run with VS Code closed: loading the model needs ~4 GB free.
  Started by evaluate_scamnet.bat.

  Starts its own Scam Alert service (so the settings are known), waits for the
  model, sends every message of the chosen dataset through the website API,
  writes a report, then stops the service it started.
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "FactLens - ScamNet-BN evaluation"

function Section($text) { Write-Host ""; Write-Host "== $text ==" -ForegroundColor Cyan }

# -- choose the dataset ---------------------------------------------------------
Section "Which messages?"
$dataset = Join-Path $Root "data\external\banglaphish_2026_master.csv"
Write-Host "  1  Quick : BanglaPhish-2026 test split (~800 unique messages, about 5 minutes)"
Write-Host "  2  Full  : all of BanglaPhish-2026 (~5,400 unique messages, about 25-30 minutes)"
Write-Host "             and record the result as the model's external evaluation in the registry"
Write-Host "  3  Mine  : a CSV of messages you collected (columns: text, label = scam / legitimate / promo)"
$choice = Read-Host "Choose 1, 2 or 3"

$evalArgs = @()
switch ($choice) {
    "1" { $evalArgs = @("--csv", $dataset, "--text-col", "text_bn", "--label-col", "label", "--name", "BanglaPhish-2026", "--synthetic", "--split", "test") }
    "2" { $evalArgs = @("--csv", $dataset, "--text-col", "text_bn", "--label-col", "label", "--name", "BanglaPhish-2026", "--synthetic", "--register") }
    "3" {
        $path = (Read-Host "Full path to your CSV").Trim('"')
        if (-not (Test-Path $path)) { Write-Host "File not found: $path" -ForegroundColor Red; Read-Host "Press Enter to exit"; exit 1 }
        $name = Read-Host "A short name for this dataset (e.g. Team-collected SMS)"
        $evalArgs = @("--csv", $path, "--name", $name)
        $text = Read-Host "Name of the text column (Enter for 'text')"
        if ($text) { $evalArgs += @("--text-col", $text) }
        $reg = Read-Host "Record this as the model's external evaluation in the registry? (y/n)"
        if ($reg -eq "y") { $evalArgs += "--register" }
    }
    default { Write-Host "Please run again and choose 1, 2 or 3."; Read-Host "Press Enter to exit"; exit 1 }
}

if ($choice -in "1", "2" -and -not (Test-Path $dataset)) {
    Write-Host "BanglaPhish-2026 not found at $dataset" -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit 1
}

# -- port must be free so we know the service's settings ------------------------------
if (Get-NetTCPConnection -LocalPort 8003 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host ""
    Write-Host "Scam Alert is already running on port 8003 (probably from check_scamnet_website.bat)." -ForegroundColor Yellow
    Write-Host "Close its window ('Scam Alert + ScamNet-BN (8003)'), then run this again."
    Write-Host "This tool starts its own copy so the evaluation settings are known."
    Read-Host "Press Enter to exit"; exit 1
}

# -- memory -----------------------------------------------------------------------
$freeCommit = (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB
if ($freeCommit -lt 4.5) {
    Write-Host ("Only {0:N1} GB free; the model needs about 4 GB to load. Close VS Code and other apps, then press Enter." -f $freeCommit) -ForegroundColor Yellow
    Read-Host
}

# -- start Scam Alert ---------------------------------------------------------------
Section "Starting Scam Alert with ScamNet-BN"
$env:PYTHONPATH = Join-Path $Root "services\shared"
$env:MODEL_REGISTRY_PATH = Join-Path $Root "models\registry.json"
$env:SCAMNET_MODEL_DIR = Join-Path $Root "models\scamnet"
$env:SCAMNET_DEVICE = "cpu"
$env:SCAMNET_MAX_MODELS = "1"
$env:SCAMNET_TIMEOUT_SECONDS = "10"
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"
# Structural link checks stay on; only the network redirect tracing is skipped,
# so the run does not send thousands of requests to (synthetic) scam domains.
$env:URL_ANALYSIS_FOLLOW_REDIRECTS = "false"
# Keep evaluation scans out of the website's history database.
$env:DATABASE_URL = "sqlite:///" + (Join-Path $env:TEMP "factlens_scamnet_eval.db").Replace('\', '/')
$env:PYTHONIOENCODING = "utf-8"

$service = Start-Process py -ArgumentList "-m", "uvicorn", "src.main:app", "--host", "127.0.0.1", "--port", "8003" `
    -WorkingDirectory (Join-Path $Root "services\scam-service") -PassThru

Write-Host "Loading the model (1-5 minutes)..."
$deadline = (Get-Date).AddMinutes(10); $health = $null
while ((Get-Date) -lt $deadline) {
    try { $health = Invoke-RestMethod "http://127.0.0.1:8003/health" -TimeoutSec 5; break }
    catch { Start-Sleep 3; Write-Host -NoNewline "." }
}
Write-Host ""

$exitCode = 1
try {
    if (-not $health) { throw "Scam Alert did not start within 10 minutes." }
    if (-not $health.model.available) { throw "ScamNet-BN did not load: $($health.model.last_error)" }
    Write-Host "ScamNet-BN $($health.model.version) loaded." -ForegroundColor Green

    Section "Evaluating"
    py (Join-Path $Root "services\scam-service\scripts\evaluate_live.py") @evalArgs
    $exitCode = $LASTEXITCODE
}
catch {
    Write-Host $_ -ForegroundColor Red
}
finally {
    # Stop only the service this script started (the py launcher and its python child).
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$($service.Id)" -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Stop-Process -Id $service.Id -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $env:TEMP "factlens_scamnet_eval.db") -ErrorAction SilentlyContinue
}

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "Done. Full report: $Root\scamnet_eval_report.txt" -ForegroundColor Green
    Write-Host "Every prediction: $Root\evaluation\ (CSV, opens in Excel)"
} else {
    Write-Host "The evaluation did not finish. See the messages above." -ForegroundColor Red
}
Read-Host "Press Enter to close"
