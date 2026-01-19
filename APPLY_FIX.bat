@echo off
echo ==========================================
echo      APPLYING FIX
echo ==========================================
echo.
echo 1. Saving changes...
git add .
git commit -m "Fix wildcard route for Render"

echo.
echo 2. Uploading fix...
git push

echo.
echo DONE! Check Render Dashboard now.
pause
