import requests
import json
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://localhost:8000"
VERIFY_SSL = False

def test_save_schedule():
    print("--- Testing Save Schedule ---")
    
    # 1. Login
    email = "saneetta@gmail.com"
    password = "password"
    
    print(f"Logging in as {email}...")
    token = None
    try:
        res = requests.post(f"{BASE_URL}/token", data={"username": email, "password": password}, verify=VERIFY_SSL, timeout=5)
        if res.status_code == 200:
            token = res.json()["access_token"]
        else:
            print(f"Login failed: {res.status_code} {res.text}")
            return
    except Exception as e:
        print(f"Login Error: {e}")
        return

    # 2. Save Schedule
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Create a dummy schedule payload
    schedule_payload = [
        {
            "day_of_week": 0, # Monday
            "start_time": "09:00",
            "end_time": "17:00",
            "is_active": True
        },
        {
            "day_of_week": 1, # Tuesday
            "start_time": "10:00",
            "end_time": "16:00",
            "is_active": True
        }
    ]
    
    print("Sending POST /doctors/schedule...")
    try:
        res = requests.post(f"{BASE_URL}/doctors/schedule", headers=headers, json=schedule_payload, verify=VERIFY_SSL, timeout=5)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
        
        if res.status_code == 200:
            print("[SUCCESS] Schedule saved.")
        else:
            print("[FAILED] Could not save schedule.")
            
    except Exception as e:
        print(f"Request Error: {e}")

if __name__ == "__main__":
    test_save_schedule()
