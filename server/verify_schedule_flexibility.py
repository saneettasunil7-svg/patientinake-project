
import requests
import json
from datetime import datetime

API_BASE = "https://localhost:8000"
# Use any existing doctor credentials or tokens if available, otherwise login
# For this test, we'll try to find a doctor and set a holiday for them today.

def test_date_exclusion():
    # 1. Login as doctor
    login_res = requests.post(f"{API_BASE}/token", data={"username": "doctor@clinic.com", "password": "password123"}, verify=False)
    if not login_res.ok:
        print("Login failed")
        return
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get today's date
    today = datetime.now().strftime("%Y-%m-%d")
    print(f"Setting today ({today}) as a holiday...")

    # 3. Set today as unavailable date
    settings_res = requests.put(
        f"{API_BASE}/doctors/availability/settings",
        json={"unavailable_days": [], "unavailable_dates": [today]},
        headers=headers,
        verify=False
    )
    if settings_res.ok:
        print("Holiday set successfully.")
    else:
        print(f"Failed to set holiday: {settings_res.text}")
        return

    # 4. Check if doctor is available in list_doctors
    list_res = requests.get(f"{API_BASE}/doctors/", headers=headers, verify=False)
    doctors = list_res.json()
    my_doctor = next((d for d in doctors if d["email"] == "doctor@clinic.com"), None)
    
    if my_doctor:
        print(f"Doctor Status: {my_doctor['full_name']} - Available: {my_doctor['is_available']}")
        if not my_doctor['is_available']:
            print("SUCCESS: Doctor correctly marked as unavailable due to specific date exclusion.")
        else:
            print("FAILURE: Doctor should be unavailable today.")
    else:
        print("Doctor not found in list")

    # 5. Cleanup: Remove the holiday
    print("Cleaning up holiday...")
    requests.put(
        f"{API_BASE}/doctors/availability/settings",
        json={"unavailable_days": [], "unavailable_dates": []},
        headers=headers,
        verify=False
    )
    print("Cleanup complete.")

if __name__ == "__main__":
    test_date_exclusion()
