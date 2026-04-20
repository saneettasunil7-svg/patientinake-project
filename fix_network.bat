@echo off
echo ========================================
echo MediConnect - Firewall Configuration
echo ========================================
echo.
echo This script will configure Windows Firewall to allow
echo incoming connections on ports 3000 and 8000 for LAN access.
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo [Step 1/2] Adding firewall rule for Frontend (port 3000)...
netsh advfirewall firewall delete rule name="MediConnect Frontend" >nul 2>&1
netsh advfirewall firewall add rule name="MediConnect Frontend" dir=in action=allow protocol=TCP localport=3000
if %errorLevel% equ 0 (
    echo [OK] Frontend port 3000 allowed
) else (
    echo [ERROR] Failed to add frontend rule
)
echo.

echo [Step 2/2] Adding firewall rule for Backend (port 8000)...
netsh advfirewall firewall delete rule name="MediConnect Backend" >nul 2>&1
netsh advfirewall firewall add rule name="MediConnect Backend" dir=in action=allow protocol=TCP localport=8000
if %errorLevel% equ 0 (
    echo [OK] Backend port 8000 allowed
) else (
    echo [ERROR] Failed to add backend rule
)
echo.

echo ========================================
echo Configuration Complete!
echo ========================================
echo.
echo Your local IP address is:
ipconfig | findstr /i "IPv4"
echo.
echo You can now access the application from other devices:
echo   Frontend: https://YOUR_IP:3000
echo   Backend:  https://YOUR_IP:8000
echo.
echo IMPORTANT: You must accept SSL certificate warnings in your browser!
echo.
pause
