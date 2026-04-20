
import requests
import json
import sys

BASE_URL = "https://localhost:8001"
# Disable warnings for self-signed certs
requests.packages.urllib3.disable_warnings()

def debug_availability():
    print(f"Targeting: {BASE_URL}")
    
    # 1. Login as Doctor
    print("\n1. Logging in as Doctor (sai@gmail.com)...")
    try:
        resp = requests.post(
            f"{BASE_URL}/token",
            data={"username": "sai@gmail.com", "password": "password123"},
            verify=False
        )
        if resp.status_code != 200:
            print(f"Failed to login: {resp.text}")
            return
        
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   Success!")
    except Exception as e:
        print(f"   Error connecting: {e}")
        return

    # 2. Get Current Status
    print("\n2. Checking My Availability...")
    resp = requests.get(f"{BASE_URL}/doctors/me/availability", headers=headers, verify=False)
    if resp.status_code == 200:
        print(f"   Current Status: {resp.json()}")
    else:
        print(f"   Failed to get status: {resp.text}")

    # 3. Force ON
    print("\n3. Toggling Availability to ON...")
    resp = requests.put(
        f"{BASE_URL}/doctors/availability", 
        json={"is_available": True}, 
        headers=headers, 
        verify=False
    )
    if resp.status_code == 200:
        print(f"   New Status: {resp.json()}")
    else:
        print(f"   Failed to toggle: {resp.text}")

    # 4. Fetch Doctor List (As if we are a patient - doc can also read this)
    print("\n4. Fetching Doctor List (Public View)...")
    resp = requests.get(f"{BASE_URL}/doctors/", headers=headers, verify=False)
    if resp.status_code == 200:
        docs = resp.json()
        found = False
        for d in docs:
            if d['email'] == "sai@gmail.com":
                found = True
                print(f"   Found myself in list: {d}")
        
        if not found:
            print("   Did not find 'sai@gmail.com' in the list!")
    else:
        print(f"   Failed to list doctors: {resp.text}")

if __name__ == "__main__":
    debug_availability()
