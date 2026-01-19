@echo off
echo Starting Z-on Door Application...

:: Start Backend in a new window
echo Starting Backend Server...
start "Z-on Door Server" cmd /k "cd server && npm start"

:: Start Frontend in a new window
echo Starting Frontend Client...
start "Z-on Door Client" cmd /k "cd client && npm run dev"

echo.
echo Application is starting...
echo Please wait a moment for the windows to initialize.
echo The app should open in your browser at http://localhost:5173
echo.
pause
