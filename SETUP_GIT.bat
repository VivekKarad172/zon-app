@echo off
echo ==========================================
echo      SETTING UP GITHUB REPOSITORY
echo ==========================================
echo.
echo 1. Initializing Git...
git init

echo.
echo 2. Adding all files...
git add .

echo.
echo 3. Saving changes (Committing)...
git commit -m "Ready for Render Deployment"

echo.
echo ==========================================
echo      LOCAL SETUP COMPLETE!
echo ==========================================
echo.
echo NOW DO THIS:
echo 1. Go to GitHub.com and create a repository called 'zon-app'.
echo 2. Copy the URL that looks like: https://github.com/YOURNAME/zon-app.git
echo 3. Come back here and type:
echo    git remote add origin PASTE_URL_HERE
echo    git push -u origin main
echo.
cmd /k
