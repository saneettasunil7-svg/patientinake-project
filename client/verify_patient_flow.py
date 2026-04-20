import requests
import time

# Use HTTPS because we enabled SSL
BASE_URL = "https://127.0.0.1:8000"
# We need verify=False because self-signed cert
VERIFY_SSL = False

def run_verification():
    print(f"Connecting to {BASE_URL}...")
    try:
        # 0. Check Health
        r = requests.get(f"{BASE_URL}/", verify=VERIFY_SSL)
        print(f"Health Check: {r.status_code}")
    except Exception as e:
        print(f"Health Check Failed: {e}")
        return

    # 1. Login
    login_data = {
        "username": "patient@clinic.com",
        "password": "patient123"
    }
    try:
        print("Logging in...")
        r = requests.post(f"{BASE_URL}/token", data=login_data, verify=VERIFY_SSL)
        if r.status_code != 200:
            print(f"Login Failed: {r.status_code} - {r.text}")
            return
        
        token = r.json()["access_token"]
        print("Login Successful. Token received.")
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Doctors
        print("Fetching doctors...")
        r_docs = requests.get(f"{BASE_URL}/doctors/", headers=headers, verify=VERIFY_SSL)
        docs = r_docs.json()
        if not docs:
            print("No doctors found to request token from.")
            return
        
        doctor_id = docs[0]["id"]
        print(f"Found Doctor ID: {doctor_id}")

        # 3. Check for existing token
        print("Checking existing active token...")
        r_my_token = requests.get(f"{BASE_URL}/tokens/my-active/token", headers=headers, verify=VERIFY_SSL)
        if r_my_token.status_code == 200:
            print(f"Found existing token: {r_my_token.json()}")
            # Determine if we should cancel it to test creation? 
            # Let's cancel it to ensure clean slate for 'Request Consultation' test
            token_id = r_my_token.json()["id"]
            print(f"Cancelling existing token {token_id}...")
            requests.put(f"{BASE_URL}/tokens/{token_id}/cancel", headers=headers, verify=VERIFY_SSL)
            time.sleep(1)
        
        # 4. Request Token
        print(f"Requesting NEW token for Doctor {doctor_id}...")
        payload = {"doctor_id": doctor_id}
        r_token = requests.post(f"{BASE_URL}/tokens/", json=payload, headers=headers, verify=VERIFY_SSL)
        
        if r_token.status_code == 200:
            print("Token Request SUCCESSFUL!")
            print(r_token.json())
            
            # Verify we can find it with new endpoint
            time.sleep(0.5)
            r_check = requests.get(f"{BASE_URL}/tokens/my-active/token", headers=headers, verify=VERIFY_SSL)
            if r_check.status_code == 200 and r_check.json()["id"] == r_token.json()["id"]:
                print("Verification: New endpoint correctly found the just created token.")
            else:
                print("Verification FAILED: New endpoint did not find the token.")
                print(f"Status: {r_check.status_code}, Body: {r_check.text}")

        else:
            print(f"Token Request FAILED: {r_token.status_code}")
            print(r_token.text)

    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    # Suppress InsecureRequestWarning
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    run_verification()
