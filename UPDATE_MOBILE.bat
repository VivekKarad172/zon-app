@echo off
echo ==========================================
echo      UPDATING MOBILE APPLICATION
echo ==========================================
echo 1. Building React App...
cd client
call npm run build

echo.
echo 2. Syncing with Android Project...
call npx cap sync

echo.
echo ==========================================
echo      UPDATE COMPLETE!
echo ==========================================
echo Now go to Android Studio and click the Play Button again.
echo.
pause
