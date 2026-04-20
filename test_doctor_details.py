import requests
import sys
import urllib3
import random
import string

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://127.0.0.1:8000"

def get_random_string(length=8):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def test_doctor_access():
    email = f"user_{get_random_string()}@example.com"
    password = "password123"

    # 1. Register
    print(f"Registering {email}...")
    try:
        res = requests.post(f"{BASE_URL}/users/", json={
            "email": email,
            "password": password,
            "full_name": "Test Patient",
            "role": "patient"
        }, verify=False)
        if res.status_code != 200:
            print(f"Registration failed: {res.status_code} - {res.text}")
            return
    except Exception as e:
        print(f"Registration error: {e}")
        return

    # 2. Login
    print("Logging in...")
    login_data = {
        "username": email, 
        "password": password
    }
    
    try:
        res = requests.post(f"{BASE_URL}/token", data=login_data, verify=False)
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
        
        token = res.json()["access_token"]
        print("Login successful. Token obtained.")
        
        # 3. Get User Me (Simulate AuthContext)
        headers = {"Authorization": f"Bearer {token}"}
        res_me = requests.get(f"{BASE_URL}/users/me", headers=headers, verify=False)
        if res_me.status_code != 200:
            print(f"Users/me failed: {res_me.status_code} {res_me.text}")
        else:
            print(f"Users/me success: {res_me.json()['email']}")

        # 4. List Doctors to get an ID
        print("Fetching doctor list...")
        res_docs = requests.get(f"{BASE_URL}/doctors/", headers=headers, verify=False)
        if res_docs.status_code != 200:
             print(f"List doctors failed: {res_docs.status_code} {res_docs.text}")
             return

        doctors = res_docs.json()
        if not doctors:
            print("No doctors found.")
            return

        target_doctor_id = doctors[0]['id']
        print(f"Testing access to Doctor ID: {target_doctor_id}")

        # 5. Get Doctor Details
        url = f"{BASE_URL}/doctors/{target_doctor_id}"
        print(f"GET {url}")
        res_detail = requests.get(url, headers=headers, verify=False)
        
        if res_detail.status_code == 200:
            print("Success! Doctor details fetched.")
        else:
            print(f"FAILED. Status: {res_detail.status_code}")
            print(res_detail.text)

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_doctor_access()
