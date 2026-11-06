@echo off
REM ===========================================================================
REM  Check that BanglaVerify works inside the FactLens website (Rumor Scanner).
REM
REM  BanglaVerify needs about 1.5 GB of free memory; VS Code can stay open.
REM
REM  Starts Identity + Rumor Scanner (which loads the model), runs a live check
REM  of four claims through the API, then opens the website. Results are also
REM  written to banglaverify_check_report.txt.
REM ===========================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check_banglaverify_website.ps1"
