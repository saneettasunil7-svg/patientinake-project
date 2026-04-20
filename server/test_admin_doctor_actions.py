import requests
import sys

# Assume backend is running on https://localhost:8000
BASE_URL = "https://localhost:8000"

def get_token(role="admin"):
    # Simple login to get token
    payload = {
        "username": "admin@clinic.com",
        "password": "admin123"
    }
    # Note: Check if credentials are correct for your environment
    res = requests.post(f"{BASE_URL}/token", data=payload, verify=False)
    if res.ok:
        return res.json()["access_token"]
    else:
        print(f"Login failed: {res.text}")
        return None

def test_admin_actions():
    token = get_token("admin")
    if not token: return
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a dummy doctor for testing
    doctor_data = {
        "email": "test_delete_doc@example.com",
        "password": "testpassword",
        "full_name": "Test Deletion Doctor",
        "specialization": "Testing",
        "bio": "To be deleted"
    }
    res = requests.post(f"{BASE_URL}/admin/doctors", json=doctor_data, headers=headers, verify=False)
    if not res.ok:
        print(f"Doctor creation failed: {res.text}")
        return
    doctor = res.json()
    doc_id = doctor["id"]
    print(f"Created test doctor with ID: {doc_id}")

    # 2. Test Verify (PUT)
    res = requests.put(f"{BASE_URL}/admin/doctors/{doc_id}/verify", headers=headers, verify=False)
    print(f"Verify status: {res.status_code}, Response: {res.text}")

    # 3. Test Edit (PUT)
    update_data = {
        "full_name": "Updated Name",
        "specialization": "Updated Specialist",
        "bio": "Updated bio content"
    }
    res = requests.put(f"{BASE_URL}/admin/doctors/{doc_id}", json=update_data, headers=headers, verify=False)
    print(f"Update status: {res.status_code}, Response: {res.text}")

    # 4. Test Delete (DELETE)
    res = requests.delete(f"{BASE_URL}/admin/doctors/{doc_id}", headers=headers, verify=False)
    print(f"Delete status: {res.status_code}, Response: {res.text}")

    # 5. Verify it's gone
    res = requests.get(f"{BASE_URL}/admin/doctors", headers=headers, verify=False)
    all_docs = res.json()
    exists = any(d["id"] == doc_id for d in all_docs)
    print(f"Doctor still exists in list? {exists}")

if __name__ == "__main__":
    # Suppress insecure request warning for self-signed certs
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    test_admin_actions()
