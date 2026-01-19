@echo off
echo ==========================================
echo      STOPPING OLD SERVERS (CLEANUP)
echo ==========================================
taskkill /F /IM node.exe
echo.
echo Servers stopped. Waiting 3 seconds...
timeout /t 3 /nobreak >nul
echo.
echo ==========================================
echo      STARTING NEW SERVERS
echo ==========================================
call START_APP.bat
