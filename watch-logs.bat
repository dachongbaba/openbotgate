@echo off
echo Watching OpenGate logs...
echo Press Ctrl+C to stop
timeout /t 2 /nobreak >nul
powershell -Command "Get-Content -Path 'logs\opengate-*.log' -Wait -Tail 50"