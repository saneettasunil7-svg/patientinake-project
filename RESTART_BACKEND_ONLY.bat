@echo off
echo Restarting Backend...
taskkill /F /IM uvicorn.exe
timeout /t 2
cd server
start ..\.venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload
echo Backend restart initiated.
