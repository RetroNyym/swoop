@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -Command "$p = Get-Content 'data\pid.txt' -ErrorAction SilentlyContinue; if ($p) { try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host 'Panel kapatildi.' } catch { Write-Host 'Panel zaten kapali.' } } else { Write-Host 'Panel zaten kapali.' }"
timeout /t 2 >nul
