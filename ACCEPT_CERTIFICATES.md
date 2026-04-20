# ⚠️ CRITICAL: Manual Certificate Acceptance Required

## Current Status ✅
- Frontend: Running on `https://0.0.0.0:3000` 
- Backend: Running on `https://0.0.0.0:8000`
- Both using SSL certificates

## ⚠️ YOU MUST DO THIS MANUALLY - I CANNOT DO IT FOR YOU

The "Failed to fetch" error will CONTINUE until you accept the certificates in your browser. This is a ONE-TIME manual step.

---

## Step-by-Step Instructions

### 1️⃣ Open Browser (Chrome/Edge/Firefox)

### 2️⃣ Accept Backend Certificate
1. Type in address bar: `https://192.168.29.141:8000/docs`
2. Press Enter
3. You'll see: **"Your connection is not private"** or **"Warning: Potential Security Risk"**
4. Click **"Advanced"** button
5. Click **"Proceed to 192.168.29.141 (unsafe)"** or **"Accept the Risk and Continue"**
6. You should see FastAPI docs page
7. ✅ Leave this tab open

### 3️⃣ Accept Frontend Certificate  
1. Open NEW tab in same browser
2. Type in address bar: `https://192.168.29.141:3000`
3. Press Enter
4. Again see security warning
5. Click **"Advanced"**  
6. Click **"Proceed to 192.168.29.141 (unsafe)"**
7. ✅ App should load!

### 4️⃣ Login
- Email: `patient@example.com`
- Password: `password123`

---

## Why This Happens
- Self-signed SSL certificates are NOT trusted by browsers by default
- You MUST manually tell your browser to trust them
- This is NORMAL for local development
- You only do this ONCE per browser

## If "Failed to fetch" Still Happens
1. Make sure you did BOTH steps (backend AND frontend)
2. Try clearing cache (Ctrl+Shift+Delete)
3. Try in Incognito/Private window
4. Make sure you're using `https://` not `http://`

---

## Security Note
✅ This is safe for local development
✅ The certificates only work on your local machine
✅ Your actual login credentials are still secure
