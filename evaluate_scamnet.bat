@echo off
REM ===========================================================================
REM  Measure how well ScamNet-BN detects scams through the FactLens website.
REM
REM  CLOSE VS CODE FIRST (the model needs about 4 GB free to load), and close any
REM  "Scam Alert" window still open from check_scamnet_website.bat.
REM
REM  Results: scamnet_eval_report.txt, plus every prediction in evaluation\.
REM ===========================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\evaluate_scamnet.ps1"
