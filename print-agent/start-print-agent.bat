@echo off
cd /d "%~dp0"
title MVA CABLE Print Agent
echo Compiling print agent...
javac PrintAgent.java
if errorlevel 1 (
  echo.
  echo javac failed. Install a JDK and make sure javac is on PATH.
  pause
  exit /b 1
)
echo Starting print agent on 127.0.0.1:9177
echo Leave this window open while using Collection print.
echo Printer name must match Company Details, e.g. POS-58
echo.
java PrintAgent
echo.
echo Print agent stopped.
pause
