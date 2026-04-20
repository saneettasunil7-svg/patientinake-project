# Start Backend Server with Network Access
# IP: 192.168.29.141

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Patient Intake Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IP Address: 10.171.53.96" -ForegroundColor Yellow
Write-Host "Port: 8000 (HTTPS)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\server"

# Activate virtual environment if it exists
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & .\.venv\Scripts\Activate.ps1
}

Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host "Backend will be accessible at:" -ForegroundColor White
Write-Host "  - https://10.171.53.96:8000" -ForegroundColor Green
Write-Host "  - https://localhost:8000" -ForegroundColor Gray
Write-Host "  - https://127.0.0.1:8000" -ForegroundColor Gray
Write-Host ""

uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem --reload
