import requests
import time
import urllib3

# Suppress InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://127.0.0.1:8000"
VERIFY_SSL = False

def run_verification():
    print(f"Connecting to {BASE_URL}...")
    
    # 1. Login as Doctor
    print("\n--- 1. Doctor Login ---")
    doc_login = {"username": "doctor@clinic.com", "password": "doctor123"}
    r_doc = requests.post(f"{BASE_URL}/token", data=doc_login, verify=VERIFY_SSL)
    if r_doc.status_code != 200:
        print(f"Doctor Login Failed: {r_doc.status_code}")
        return
    doc_token = r_doc.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    
    # Get Doctor ID
    r_doc_me = requests.get(f"{BASE_URL}/users/me", headers=doc_headers, verify=VERIFY_SSL)
    doc_id = r_doc_me.json()["id"]
    print(f"Doctor ID: {doc_id}")

    # Ensure Doctor is online
    print("Setting Doctor to Online...")
    requests.put(f"{BASE_URL}/doctors/availability", json={"is_available": True}, headers=doc_headers, verify=VERIFY_SSL)

    # 2. Login as Patient
    print("\n--- 2. Patient Login ---")
    pat_login = {"username": "patient@clinic.com", "password": "patient123"}
    r_pat = requests.post(f"{BASE_URL}/token", data=pat_login, verify=VERIFY_SSL)
    if r_pat.status_code != 200:
        print(f"Patient Login Failed: {r_pat.status_code}")
        return
    pat_token = r_pat.json()["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}
    print("Patient Logged In")

    # 3. Patient Requests Token
    print("\n--- 3. Patient Requests Token ---")
    # First cancel any existing
    r_check = requests.get(f"{BASE_URL}/tokens/my-active/token", headers=pat_headers, verify=VERIFY_SSL)
    if r_check.status_code == 200:
        t_id = r_check.json()["id"]
        r_cancel = requests.put(f"{BASE_URL}/tokens/{t_id}/cancel", headers=pat_headers, verify=VERIFY_SSL)
        if r_cancel.status_code == 200:
            print("Cancelled existing token.")
        else:
            print(f"Failed to cancel existing token: {r_cancel.status_code} - {r_cancel.text}")
    else:
         print("No active token found (clean slate).")
    
    # Request new
    r_req = requests.post(f"{BASE_URL}/tokens/", json={"doctor_id": doc_id}, headers=pat_headers, verify=VERIFY_SSL)
    if r_req.status_code != 200:
        print(f"Token Request Failed: {r_req.status_code} - {r_req.text}")
        return
    token_data = r_req.json()
    token_id = token_data["id"]
    print(f"Token Requested! ID: {token_id}, Number: {token_data['token_number']}")

    # 4. Doctor Sees Token in Queue
    print("\n--- 4. Doctor Checks Queue ---")
    r_queue = requests.get(f"{BASE_URL}/tokens/queue/{doc_id}", headers=doc_headers, verify=VERIFY_SSL)
    queue = r_queue.json()
    found = any(t['id'] == token_id for t in queue)
    if found:
        print(f"SUCCESS: Doctor sees token {token_id} in queue.")
    else:
        print(f"FAILURE: Doctor does NOT see token {token_id} in queue.")
        print(f"Queue: {queue}")
        return

    # 5. Doctor Calls Patient
    print("\n--- 5. Doctor Calls Patient ---")
    r_call = requests.put(f"{BASE_URL}/tokens/{token_id}/call", headers=doc_headers, verify=VERIFY_SSL)
    if r_call.status_code == 200:
        print("Doctor successfully called the token.")
        print(f"Token Status: {r_call.json()['status']}")
    else:
        print(f"Call Failed: {r_call.status_code} - {r_call.text}")
        return

    # 6. Patient Sees Update
    print("\n--- 6. Patient Checks Status ---")
    r_status = requests.get(f"{BASE_URL}/tokens/my-active/token", headers=pat_headers, verify=VERIFY_SSL)
    if r_status.status_code == 200:
        status = r_status.json()["status"]
        print(f"Patient sees status: {status}")
        if status == "in_progress":
            print("SUCCESS: Patient notification logic should trigger now (frontend).")
        else:
            print(f"FAILURE: Patient does not see 'in_progress' status. Seen status: {status}")
    else:
        print(f"FAILURE: Patient could not fetch active token. Status Code: {r_status.status_code}")

    print("\nFull Flow Verification Complete.")

if __name__ == "__main__":
    run_verification()
