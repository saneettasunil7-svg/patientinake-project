import requests
import json

base_url = "http://localhost:8000"

# 1. Login as admin to get token
# (Assuming admin credentials from previous knowledge or test scripts)
login_data = {
    "username": "admin@mediconnect.com",
    "password": "adminpassword"  # Replace with actual if known
}

print("Attempting login...")
try:
    response = requests.post(f"{base_url}/token", data=login_data)
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"Login successful. Token: {token[:20]}...")
        
        # 2. Fetch doctors
        print("\nFetching doctors...")
        headers = {"Authorization": f"Bearer {token}"}
        doctors_response = requests.get(f"{base_url}/admin/doctors", headers=headers)
        
        print(f"Status Code: {doctors_response.status_code}")
        if doctors_response.status_code == 200:
            print("Success! Doctors data:")
            doctors = doctors_response.json()
            print(f"Found {len(doctors)} doctors.")
        else:
            print(f"Error fetching doctors: {doctors_response.text}")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
except Exception as e:
    print(f"Error: {e}")
