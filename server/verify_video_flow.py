import requests
import warnings
from requests.packages.urllib3.exceptions import InsecureRequestWarning

warnings.simplefilter('ignore', InsecureRequestWarning)

BASE_URL = "https://127.0.0.1:8000"
DOCTOR_ID = 7  # Dr. Saneetta

def verify_flow():
    print(f"Testing Video Flow on {BASE_URL}...")
    
    # 1. Login
    try:
        auth_res = requests.post(f"{BASE_URL}/token", data={"username": "patient@example.com", "password": "password123"}, verify=False)
        if auth_res.status_code != 200:
            print(f"Login failed: {auth_res.status_code} {auth_res.text}")
            return
        
        token = auth_res.json()["access_token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        print("Login Request: Success")
        
        # 2. Create Token
        print(f"\nRequesting Token for Doctor ID {DOCTOR_ID}...")
        token_res = requests.post(f"{BASE_URL}/tokens/", json={"doctor_id": DOCTOR_ID}, headers=headers, verify=False)
        
        if token_res.status_code == 200:
            token_data = token_res.json()
            token_id = token_data['id']
            print(f"Token Create Success: Token ID {token_id}")
        elif token_res.status_code == 400 and "already have an active token" in token_res.text:
            print("User already has a token, fetching active token...")
            # Fetch existing token
            active_res = requests.get(f"{BASE_URL}/tokens/my-active/token", headers=headers, verify=False)
            token_data = active_res.json()
            token_id = token_data['id']
            print(f"Active Token ID: {token_id}")
        else:
            print(f"Token creation failed: {token_res.status_code} {token_res.text}")
            return

        # 3. Create Video Session
        print(f"\nCreating Video Session for Token ID {token_id}...")
        session_res = requests.post(f"{BASE_URL}/video/session", json={"token_id": token_id}, headers=headers, verify=False)
        
        if session_res.status_code == 200:
            session_data = session_res.json()
            session_id = session_data['session_id']
            print(f"Video Session Created: {session_id}")
            print(f"Redirect URL would be: /video/{session_id}")
        else:
            print(f"Video Session creation failed: {session_res.status_code} {session_res.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_flow()
