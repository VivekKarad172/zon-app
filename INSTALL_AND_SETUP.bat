@echo off
echo ==========================================
echo      Z-on Door - Initial Setup
echo ==========================================
echo.

echo [1/3] Installing Server Dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo Error installing server dependencies!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Setting up Database...
call node seed.js
if %errorlevel% neq 0 (
    echo Error seeding database!
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Installing Client Dependencies...
cd ..\client
call npm install
if %errorlevel% neq 0 (
    echo Error installing client dependencies!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo      Setup Complete!
echo ==========================================
echo You can now run the "START_APP.bat" file.
pause
