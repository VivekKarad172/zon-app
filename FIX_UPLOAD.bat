@echo off
echo ==========================================
echo      FIXING UPLOAD ERROR
echo ==========================================
echo.
echo 1. Standardizing Branch Name to 'main'...
git branch -M main

echo.
echo 2. Saving all files...
git add .
git commit -m "Ready for Upload"

echo.
echo 3. Uploading to GitHub...
echo (Please sign in if asked)
git push -u origin main

echo.
echo IF IT SAYS "Success" or "Done", you can move to Part 2!
echo.
pause
