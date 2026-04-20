@echo off
REM Start Backend Server with Network Access
REM IP: 192.168.29.141

echo ========================================
echo Starting Patient Intake Backend Server
echo ========================================
echo IP Address: 192.168.29.141
echo Port: 8000 (HTTPS)
echo ========================================
echo.

cd /d "%~dp0server"

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
)

echo Starting backend server...
echo Backend will be accessible at:
echo   - https://192.168.29.141:8000
echo   - https://localhost:8000
echo   - https://127.0.0.1:8000
echo.

uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem --reload
