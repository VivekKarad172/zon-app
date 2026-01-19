@echo off
echo ==========================================
echo      FINAL USB CONNECTION FIX
echo ==========================================
echo.
echo 1. Resetting Android Debug Bridge (ADB)...
call adb kill-server
call adb start-server

echo.
echo 2. Applying Port Tunneling (The Magic)...
:: Only works if phone is connected!
call adb reverse tcp:5000 tcp:5000

echo.
echo 3. Building App (Version 8)...
cd client
call npm run build

echo.
echo 4. Syncing...
call npx cap sync

echo.
echo ==========================================
echo      DONE. OPEN ANDROID STUDIO NOW.
echo ==========================================
echo IMPORTANT: 
echo If you saw "error: no devices/emulators found" above, 
echo then your USB cable is not connected properly!
echo.
pause
