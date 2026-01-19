@echo off
echo ==========================================
echo      ENABLING USB CONNECTION (100% FIX)
echo ==========================================
echo.
echo 1. Reversing TCP Port 5000 (Magic USB Cable Trick)...
:: This sends phone traffic locally to PC
call adb reverse tcp:5000 tcp:5000

echo.
echo 2. Building App (Version 7)...
cd client
call npm run build

echo.
echo 3. Syncing...
call npx cap sync

echo.
echo ==========================================
echo      READY FOR ANDROID STUDIO
echo ==========================================
echo 1. Keep your USB cable PLUGGED IN.
echo 2. Go to Android Studio -> Click Play Button.
echo 3. It will work now.
echo.
pause
