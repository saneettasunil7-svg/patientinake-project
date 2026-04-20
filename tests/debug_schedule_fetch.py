import requests
import json
# from models import User, UserRole

# Config
BASE_URL = "https://localhost:8000"
VERIFY_SSL = False

def login_as_doctor():
    # Login to get token
    login_payload = {
        "username": "doctor@example.com", # Assuming this user exists from previous steps
        "password": "securepassword"
    }
    # Try alternate if that one doesn't exist (from debug_registration we created users)
    # Actually, let's just find a doctor in the DB first or use one we know.
    # We will try a few common test credentials
    
    creds_list = [
        ("doctor@example.com", "securepassword"),
        ("test_doctor@example.com", "password123"),
         ("saneetta@gmail.com", "password") # From valid user in prior logs?
    ]
    
    token = None
    user = None

    for email, password in creds_list:
        print(f"Trying login with {email}...")
        try:
            res = requests.post(f"{BASE_URL}/token", data={"username": email, "password": password}, verify=VERIFY_SSL, timeout=5)
            if res.status_code == 200:
                token = res.json()["access_token"]
                # Get User ID
                res_user = requests.get(f"{BASE_URL}/users/me", headers={"Authorization": f"Bearer {token}"}, verify=VERIFY_SSL)
                user = res_user.json()
                print(f"Login successful for {email} (ID: {user['id']})")
                break
        except Exception as e:
            print(f"Login failed: {e}")
            
    return token, user

def test_schedule_endpoints():
    print("\n--- Testing Schedule Endpoints ---")
    token, user = login_as_doctor()
    
    if not token:
        print("Could not log in as any doctor. Skipping tests.")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test GET /doctors/{id}/schedule
    print(f"\n1. GET /doctors/{user['id']}/schedule")
    try:
        res = requests.get(f"{BASE_URL}/doctors/{user['id']}/schedule", headers=headers, verify=VERIFY_SSL, timeout=5)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:200]}...") # Print first 200 chars
    except Exception as e:
        print(f"FAILED: {e}")

    # 2. Test GET /doctors/me/availability
    print(f"\n2. GET /doctors/me/availability")
    try:
        res = requests.get(f"{BASE_URL}/doctors/me/availability", headers=headers, verify=VERIFY_SSL, timeout=5)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:200]}...")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    # Suppress SSL warnings
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    test_schedule_endpoints()
