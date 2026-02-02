@echo off
title Z-ON Launcher
color 0A

echo ==========================================
echo      RESTARTING Z-ON SYSTEM
echo ==========================================

echo.
echo [1/3] Closing existing processes...
taskkill /F /IM node.exe >nul 2>&1
echo       Done.

echo.
echo [2/3] Starting Backend Server...
start "Z-ON Backend" cmd /k "cd server && npm start"
echo       Backend launched on Port 5000.

echo.
echo [3/3] Starting Frontend Client...
start "Z-ON Client" cmd /k "cd client && npm run dev"
echo       Frontend launched.

echo.
echo ==========================================
echo      SYSTEM RESTARTED SUCCESSFULLY
echo ==========================================
echo.
echo Please wait for the windows to initialize...
echo You can close this window now.
timeout /t 10
