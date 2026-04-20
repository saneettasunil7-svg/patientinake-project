$hbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"
$backup = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf.bak"

# 1. Backup original
Copy-Item $hbaPath $backup -Force
Write-Host "Backup saved to $backup"

# 2. Patch: replace scram-sha-256 with trust so we can connect without password
$content = Get-Content $hbaPath
$patched = $content -replace 'scram-sha-256', 'trust'
Set-Content $hbaPath $patched -Encoding UTF8
Write-Host "pg_hba.conf patched (scram-sha-256 -> trust)"

# 3. Restart service to pick up the change
Restart-Service -Name "postgresql-x64-18" -Force -ErrorAction Stop
Write-Host "PostgreSQL service restarted"
Start-Sleep -Seconds 4

# 4. Set a new known password for postgres user
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $psql -U postgres -c "ALTER USER postgres PASSWORD 'Admin1234!';"
Write-Host "Password reset to: Admin1234!"

# 5. Also create the patientintake database if it does not exist yet
& $psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='patientintake';" | Out-Null
$exists = & $psql -U postgres -tAc "SELECT COUNT(*) FROM pg_database WHERE datname='patientintake';"
if ($exists.Trim() -eq "0") {
    & $psql -U postgres -c "CREATE DATABASE patientintake;"
    Write-Host "Database 'patientintake' created"
}
else {
    Write-Host "Database 'patientintake' already exists"
}

# 6. Restore original pg_hba.conf (scram-sha-256)
Copy-Item $backup $hbaPath -Force
Write-Host "pg_hba.conf restored to scram-sha-256"

# 7. Restart service again so scram takes effect with the new password
Restart-Service -Name "postgresql-x64-18" -Force -ErrorAction Stop
Start-Sleep -Seconds 4
Write-Host "PostgreSQL restarted with secure auth. All done!"
