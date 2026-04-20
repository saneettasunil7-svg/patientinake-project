# 🔧 Fix "Network Error" - SSL Certificate Issue

## The Problem
You're getting a "Network Error" because your browser doesn't trust the backend's SSL certificate.

## ✅ Solution (Do This Once)

### Step 1: Accept Backend Certificate
1. Open a **new browser tab**
2. Go to: **`https://localhost:8000/docs`** (or `https://192.168.29.141:8000/docs` if using IP)
3. You'll see: **"Your connection is not private"** or **"Warning: Potential Security Risk"**
4. Click **"Advanced"**
5. Click **"Proceed to localhost (unsafe)"** or **"Accept the Risk and Continue"**
6. You should see the FastAPI documentation page
7. ✅ **Leave this tab open**

### Step 2: Test the Connection
1. In a **new tab**, go to: **`https://localhost:3000/test-api`**
2. Click the **"Test Connection"** button
3. You should see: **"✅ SUCCESS!"**

### Step 3: Go Back to Doctor Management
1. Go to: **`https://localhost:3000/admin/doctors`**
2. The page should now load doctors successfully!

---

## Why This Happens
- The backend uses a **self-signed SSL certificate**
- Browsers don't trust self-signed certificates by default
- You must **manually tell your browser to trust it**
- This is **normal for local development**
- You only need to do this **ONCE per browser**

---

## Still Not Working?

### Check Console Logs
1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Look for messages starting with:
   - `API URL:` - Should show `https://localhost:8000` or `https://192.168.29.141:8000`
   - `Fetching doctors with token:` - Should show a token
   - `Error status:` - If you see `401`, your session expired - **sign out and sign back in**

### Clear Browser Cache
1. Press **Ctrl+Shift+Delete**
2. Clear **Cached images and files**
3. Refresh the page

### Try Incognito/Private Window
1. Open a **new incognito/private window**
2. Accept the SSL certificate again (Step 1 above)
3. Login and try again
