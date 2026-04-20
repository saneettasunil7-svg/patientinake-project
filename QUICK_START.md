# Quick Start - Network Access

## Your IP: 192.168.29.141

## Start Servers

### Backend (Terminal 1):
```batch
cd d:\patientintake
start_backend.bat
```

### Frontend (Terminal 2):
```batch
cd d:\patientintake
start_frontend.bat
```

## Access URLs

**From any device on your network:**
- Frontend: https://192.168.29.141:3000
- Backend: https://192.168.29.141:8000

## First Time Setup

1. Accept SSL certificates in browser (both ports 3000 and 8000)
2. If can't access from other devices, add firewall rules:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Patient Intake Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Patient Intake Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

✓ Ready to use!
