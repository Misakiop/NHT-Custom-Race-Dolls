@echo off
chcp 65001 >nul
title 修复空部位 Hediff 存档
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0修复空Hediff存档.ps1" %*
