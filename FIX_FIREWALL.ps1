$port = 5000
$ruleName = "Z-On Door Mobile Access"

Write-Host "Requesting Admin Privileges to fix Firewall..." -ForegroundColor Yellow

if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "Opening Port $port for Mobile Access..." -ForegroundColor Green

# Remove old rules to be clean
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

# Add new rules for TCP and UDP
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -Profile Any
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol UDP -Action Allow -Profile Any

Write-Host "SUCCESS! Firewall is now OPEN for Port $port." -ForegroundColor Cyan
Write-Host "You can now login from your phone."
Write-Host "Press Enter to exit..."
Read-Host
