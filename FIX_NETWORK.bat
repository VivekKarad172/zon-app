@echo off
echo ==========================================
echo      FIXING NETWORK CONNECTION
echo ==========================================
echo.
echo Opening Firewall Port 5000 for Mobile Access...
netsh advfirewall firewall add rule name="Z-On Door Server" dir=in action=allow protocol=TCP localport=5000
echo.
echo Firewall Rule Added.
echo.
pause
