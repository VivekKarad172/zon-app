@echo off
echo ===========================================
echo      Z-ON DOOR DATABASE FIX & UPDATE
echo ===========================================
echo.
echo IMPORTANT: This will RESET your database to apply new features.
echo All current data will be cleared and replaced with fresh defaults.
echo.
echo Processing...
echo.

cd server
if exist "dev.db" (
    echo Deleting old database...
    del "dev.db"
)

echo Installing dependencies (just in case)...
call npm install

echo Seeding new database structure...
node seed.js

echo.
echo ===========================================
echo      DATABASE FIXED SUCCESSFULLY!
echo ===========================================
echo.
echo You can now close this window and run START_APP.bat
echo.
pause
