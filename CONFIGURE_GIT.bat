@echo off
echo ==========================================
echo      CONFIGURING GIT IDENTITY
echo ==========================================
echo.
echo Git needs to know who you are to save changes.
echo.

:: 1. Set a generic email (or you can edit this)
call git config --global user.email "vivek@example.com"

:: 2. Set a generic name
call git config --global user.name "Vivek Karad"

echo Identity Configured!
echo.
echo Now creating the commit...
call git add .
call git commit -m "Initial Deploy"

echo.
echo Now Uploading...
call git push -u origin main

echo.
pause
