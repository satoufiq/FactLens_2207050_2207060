@echo off
REM ===========================================================================
REM  Check that ScamNet-BN works inside the FactLens website.
REM
REM  CLOSE VS CODE FIRST. The model needs about 4 GB of free memory while it
REM  loads, and VS Code alone holds about 2.7 GB on this PC.
REM
REM  Starts Identity + Scam Alert (which loads the model), runs a live check of
REM  six real messages, then opens the website. Results are also written to
REM  scamnet_check_report.txt.
REM ===========================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check_scamnet_website.ps1"
