@echo off
echo ============================================
echo  Set PostgreSQL postgres user password
echo ============================================

set DATADIR=C:\Program Files\PostgreSQL\18\data
set HBAFILE=%DATADIR%\pg_hba.conf
set PSQL="C:\Program Files\PostgreSQL\18\bin\psql.exe"
set PGCTL="C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
set NEWPASS=Admin1234!

echo [1] Switching pg_hba.conf to TRUST (no password for localhost)...
(
echo # TYPE  DATABASE        USER            ADDRESS                 METHOD
echo local   all             all                                     trust
echo host    all             all             127.0.0.1/32            trust
echo host    all             all             ::1/128                 trust
echo local   replication     all                                     trust
echo host    replication     all             127.0.0.1/32            trust
echo host    replication     all             ::1/128                 trust
) > "%HBAFILE%"
takeown /f "%HBAFILE%" /a >nul
icacls "%HBAFILE%" /grant "NT SERVICE\postgresql-x64-18:(F)" /grant SYSTEM:(F) /grant Administrators:(F) >nul
echo    Done.

echo [2] Reloading PostgreSQL config (no restart needed)...
%PSQL% -U postgres -c "SELECT pg_reload_conf();"
timeout /t 2 /nobreak >nul
echo    Done.

echo [3] Setting new password for postgres user...
%PSQL% -U postgres -c "ALTER USER postgres PASSWORD '%NEWPASS%';"
echo    Password set to: %NEWPASS%

echo [4] Restoring pg_hba.conf to SCRAM-SHA-256...
(
echo # TYPE  DATABASE        USER            ADDRESS                 METHOD
echo local   all             all                                     scram-sha-256
echo host    all             all             127.0.0.1/32            scram-sha-256
echo host    all             all             ::1/128                 scram-sha-256
echo local   replication     all                                     scram-sha-256
echo host    replication     all             127.0.0.1/32            scram-sha-256
echo host    replication     all             ::1/128                 scram-sha-256
) > "%HBAFILE%"
takeown /f "%HBAFILE%" /a >nul
icacls "%HBAFILE%" /grant "NT SERVICE\postgresql-x64-18:(F)" /grant SYSTEM:(F) /grant Administrators:(F) >nul
echo    Done.

echo [5] Reloading config again with SCRAM...
%PSQL% -U postgres -c "SELECT pg_reload_conf();"
timeout /t 2 /nobreak >nul

echo.
echo ==============================================
echo  ALL DONE! 
echo  PostgreSQL password is now: %NEWPASS%
echo  Service should still be RUNNING.
echo ==============================================
pause
