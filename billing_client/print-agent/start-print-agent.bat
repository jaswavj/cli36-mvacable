@echo off
title JASXBILL Print Agent
echo Starting JASXBILL print agent on this PC...
echo Printer name must match Company Details (example: POS-80)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0jasx-print-agent.ps1"
pause
