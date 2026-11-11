@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Swoop

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. https://nodejs.org adresinden kurun.
  pause
  exit /b
)

if not exist "node_modules" (
  echo Ilk kurulum: paketler indiriliyor, biraz surebilir...
  call npm install --no-audit --no-fund
)

echo TwWa Panel baslatiliyor...
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3560"
node server.js
echo.
echo Panel kapandi.
pause
