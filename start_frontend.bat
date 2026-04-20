@echo off
REM Start Frontend Server with Network Access
REM IP: 192.168.29.141

echo ========================================
echo Starting Patient Intake Frontend Server
echo ========================================
echo IP Address: 192.168.29.141
echo Port: 3000 (HTTPS)
echo ========================================
echo.

cd /d "%~dp0client"

echo Starting frontend server...
echo Frontend will be accessible at:
echo   - https://192.168.29.141:3000
echo   - https://localhost:3000
echo   - https://127.0.0.1:3000
echo.
echo IMPORTANT: You must accept the SSL certificate in your browser!
echo.

call npm run dev
