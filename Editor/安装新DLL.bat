@echo off
chcp 65001 >nul
title 安装 NHT_CustomDolls.dll
set "SRC=%~dp0..\Source\build\NHT_CustomDolls.dll"
if not exist "%SRC%" set "SRC=%TEMP%\nhtbuild\NHT_CustomDolls.dll"
set "DST=%~dp0..\Assemblies\NHT_CustomDolls.dll"

if not exist "%SRC%" (
  echo 没有找到新编译的 DLL。
  echo 请先运行 Source\build.ps1 -OutDir "Source\build" 重新编译。
  pause
  exit /b 1
)

echo 源文件：%SRC%
echo 目标：%DST%
copy /Y "%SRC%" "%DST%" >nul
if errorlevel 1 (
  echo.
  echo 写入失败：RimWorld 还在运行，DLL 被占用。
  echo 请完全退出游戏（不是最小化）后再运行本脚本。
  pause
  exit /b 1
)
echo.
echo 已更新 NHT_CustomDolls.dll，重新启动游戏即可生效。
timeout /t 2 /nobreak >nul
