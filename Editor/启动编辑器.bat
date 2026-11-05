@echo off
title NHT ½âÆÊ±à¼­Æ÷
chcp 65001 >nul
cd /d "%~dp0"
if exist "NHT-Anatomy-Editor.exe" (
  start "" "NHT-Anatomy-Editor.exe"
  exit /b 0
)
set "PSEXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PSEXE%" set "PSEXE=powershell.exe"
"%PSEXE%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if errorlevel 1 pause