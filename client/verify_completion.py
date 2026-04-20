import requests
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

    # 2. Get Queue
    print("\n--- 2. Checking Queue ---")
    r_queue = requests.get(f"{BASE_URL}/tokens/queue/{doc_id}", headers=doc_headers, verify=VERIFY_SSL)
    queue = r_queue.json()
    print(f"Found {len(queue)} tokens in queue.")
    
    in_progress_tokens = [t for t in queue if t['status'] == 'in_progress']
    
    if not in_progress_tokens:
        print("No 'in_progress' tokens found to complete.")
        # Try to find a waiting one and call it?
        waiting_tokens = [t for t in queue if t['status'] == 'waiting']
        if waiting_tokens:
            t_id = waiting_tokens[0]['id']
            print(f"Calling token {t_id} to make it in_progress...")
            requests.put(f"{BASE_URL}/tokens/{t_id}/call", headers=doc_headers, verify=VERIFY_SSL)
            in_progress_tokens = [{'id': t_id}]
        else:
            print("No tokens available to test.")
            return

    # 3. Complete Token
    t_to_complete = in_progress_tokens[0]['id']
    print(f"\n--- 3. Completing Token {t_to_complete} ---")
    r_comp = requests.put(f"{BASE_URL}/tokens/{t_to_complete}/complete", headers=doc_headers, verify=VERIFY_SSL)
    
    if r_comp.status_code == 200:
        print("SUCCESS: Token completed.")
        print(r_comp.json())
    else:
        print(f"FAILURE: Could not complete token. {r_comp.status_code} - {r_comp.text}")

if __name__ == "__main__":
    run_verification()
