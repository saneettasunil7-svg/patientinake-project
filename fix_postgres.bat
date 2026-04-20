@echo off
echo ============================================
echo  Fix pg_hba.conf and Start PostgreSQL 18
echo ============================================

set DATADIR=C:\Program Files\PostgreSQL\18\data
set HBAFILE=%DATADIR%\pg_hba.conf

echo [1] Writing correct pg_hba.conf (scram-sha-256)...
(
echo # TYPE  DATABASE        USER            ADDRESS                 METHOD
echo.
echo # local is for Unix domain socket connections only
echo local   all             all                                     scram-sha-256
echo # IPv4 local connections:
echo host    all             all             127.0.0.1/32            scram-sha-256
echo # IPv6 local connections:
echo host    all             all             ::1/128                 scram-sha-256
echo # Replication connections:
echo local   replication     all                                     scram-sha-256
echo host    replication     all             127.0.0.1/32            scram-sha-256
echo host    replication     all             ::1/128                 scram-sha-256
) > "%HBAFILE%"
echo    Done.

echo [2] Taking ownership and fixing permissions...
takeown /f "%HBAFILE%" /a >nul
icacls "%HBAFILE%" /grant "NT SERVICE\postgresql-x64-18:(F)" /grant SYSTEM:(F) /grant Administrators:(F) >nul
echo    Done.

echo [3] Also remove stale postmaster.pid if present...
if exist "%DATADIR%\postmaster.pid" (
    del "%DATADIR%\postmaster.pid"
    echo    Deleted stale postmaster.pid
) else (
    echo    No stale postmaster.pid found.
)

echo [4] Starting PostgreSQL service...
net start postgresql-x64-18
timeout /t 4 /nobreak >nul

echo.
echo [5] Final service status:
sc query postgresql-x64-18 | findstr "STATE"
echo.
echo If STATE = 4 RUNNING, SUCCESS! 
echo If still STOPPED, look for error in Windows Event Viewer > Application
pause
