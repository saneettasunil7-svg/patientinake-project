# Start Frontend Server with Network Access
# IP: 192.168.29.141

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Patient Intake Frontend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IP Address: 10.171.53.96" -ForegroundColor Yellow
Write-Host "Port: 3000 (HTTPS)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\client"

Write-Host "Starting frontend server..." -ForegroundColor Green
Write-Host "Frontend will be accessible at:" -ForegroundColor White
Write-Host "  - https://10.171.53.96:3000" -ForegroundColor Green
Write-Host "  - https://localhost:3000" -ForegroundColor Gray
Write-Host "  - https://127.0.0.1:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT: You must accept the SSL certificate in your browser for ports 3000 AND 8000!" -ForegroundColor Yellow
Write-Host ""

npm run dev
