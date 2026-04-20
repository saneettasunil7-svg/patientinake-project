import requests
import json

BASE_URL = "https://localhost:8000"
ADMIN_EMAIL = "admin@clinic.com"
ADMIN_PASSWORD = "admin123"
PATIENT_EMAIL = "patient@clinic.com"
PATIENT_PASSWORD = "patient123"

def test_login_and_policies():
    print("Testing Admin Login...")
    login_data = {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/token", data=login_data, verify=False)
    assert response.status_code == 200
    admin_data = response.json()
    admin_token = admin_data["access_token"]
    print("✅ Admin Login Success. User data returned:", admin_data.get("user", {}).get("role"))

    print("\nTesting Policy Creation...")
    policy_data = {"title": "Test Policy", "content": "Initial content"}
    response = requests.post(
        f"{BASE_URL}/admin/policies",
        json=policy_data,
        headers={"Authorization": f"Bearer {admin_token}"},
        verify=False
    )
    assert response.status_code == 200
    policy = response.json()
    policy_id = policy["id"]
    print(f"✅ Policy Created: ID {policy_id}")

    print("\nTesting Policy Update...")
    updated_data = {"title": "Updated Test Policy", "content": "Updated content"}
    response = requests.put(
        f"{BASE_URL}/admin/policies/{policy_id}",
        json=updated_data,
        headers={"Authorization": f"Bearer {admin_token}"},
        verify=False
    )
    assert response.status_code == 200
    print("✅ Policy Updated Successfully")

    print("\nTesting Patient Visibility...")
    patient_login = {"username": PATIENT_EMAIL, "password": PATIENT_PASSWORD}
    response = requests.post(f"{BASE_URL}/token", data=patient_login, verify=False)
    assert response.status_code == 200
    patient_token = response.json()["access_token"]
    
    response = requests.get(
        f"{BASE_URL}/admin/policies/public",
        headers={"Authorization": f"Bearer {patient_token}"},
        verify=False
    )
    assert response.status_code == 200
    policies = response.json()
    found = any(p["id"] == policy_id and "Updated" in p["title"] for p in policies)
    assert found
    print("✅ Policy visible to Patient with updated content")

    print("\nTesting RBAC (Patient accessing admin endpoint)...")
    response = requests.get(
        f"{BASE_URL}/admin/policies",
        headers={"Authorization": f"Bearer {patient_token}"},
        verify=False
    )
    assert response.status_code == 403
    print("✅ RBAC check: Patient correctly forbidden from admin-only policies endpoint")

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    try:
        test_login_and_policies()
        print("\n✨ ALL TESTS PASSED! ✨")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
