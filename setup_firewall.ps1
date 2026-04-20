# Run this script as Administrator to configure Windows Firewall allow rules

Write-Host "Configuring Windows Firewall for Patient Intake App..." -ForegroundColor Cyan

try {
    New-NetFirewallRule -DisplayName "Patient Intake Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction Stop
    New-NetFirewallRule -DisplayName "Patient Intake Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction Stop
    Write-Host "Success! Firewall rules added for ports 3000 and 8000." -ForegroundColor Green
}
catch {
    Write-Host "Error: Failed to add firewall rules. Please ensure you are running this script as Administrator." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
