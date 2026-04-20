# RESTART INSTRUCTIONS - HTTP Configuration

## What I Changed
✅ Switched BOTH frontend and backend to HTTP (no more SSL certificates!)
✅ Killed all old backend processes
✅ Started clean HTTP backend on port 8000

## What YOU Need to Do

### Step 1: Stop Frontend
In your terminal running `npm run dev`:
- Press `Ctrl+C` to stop it

### Step 2: Start Frontend Again
```bash
cd d:\patientintake\client
npm run dev
```

### Step 3: Access the App
Open browser and go to:
```
http://192.168.29.141:3000
```
**IMPORTANT**: Use `http://` NOT `https://`

### Step 4: Login
- Email: `patient@example.com`
- Password: `password123`

## Why This Works
- ✅ No SSL certificates needed
- ✅ No browser warnings  
- ✅ Works immediately
- ✅ Perfect for local development

**Note**: HTTP is fine for local development since traffic doesn't leave your computer/network.
