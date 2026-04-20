import requests
import datetime
import time
import socket

socket.setdefaulttimeout(5)

BASE_URL = "http://localhost:8000"

def register_user(email, password, role, profile_data=None):
    # Try login first
    try:
        data = {"username": email, "password": password}
        res = requests.post(f"{BASE_URL}/auth/token", data=data, timeout=5)
        if res.status_code == 200:
            return res.json()["access_token"]
    except:
        pass

    # Register if login fails or user doesn't exist (api might not have register endpoint easily accessible without auth, 
    # but usually /auth/register is open. Let's assume we can use existing seed users or create new ones via register)
    
    # Actually, in this project, registration might be under /auth/register.
    # Let's try to register.
    reg_data = {
        "email": email,
        "password": password,
        "role": role,
        "is_active": True
    }
    res = requests.post(f"{BASE_URL}/auth/register", json=reg_data)
    if res.status_code == 201 or res.status_code == 200:
        print(f"Registered {role}: {email}")
        
    # Login again
    data = {"username": email, "password": password}
    res = requests.post(f"{BASE_URL}/auth/token", data=data)
    if res.status_code != 200:
        print(f"Login failed for {email}: {res.text}")
        return None
    token = res.json()["access_token"]
    
    # Create Profile if needed
    headers = {"Authorization": f"Bearer {token}"}
    if role == "doctor":
        profile = {
            "full_name": "Dr. Verification",
            "specialization": "General",
            "phone_number": "1234567890",
            "address": "Test Clinic",
            "city": "Test City",
            "state": "Test State",
            "zip_code": "12345"
        }
        requests.post(f"{BASE_URL}/doctors/profile", json=profile, headers=headers)
    elif role == "patient":
        profile = {
            "full_name": "Patient Verification",
            "date_of_birth": "1990-01-01",
            "gender": "Male",
            "contact_number": "0987654321",
            "address": "Test Street"
        }
        requests.post(f"{BASE_URL}/patients/profile", json=profile, headers=headers)
        
    return token

def main():
    print("--- Starting Verification ---")
    
    # 1. Setup Users
    doctor_token = register_user("doc_test@example.com", "password", "doctor")
    patient_token = register_user("pat_test@example.com", "password", "patient")
    
    if not doctor_token or not patient_token:
        print("Failed to authenticate users.")
        return

    # Get Doctor ID
    doc_profile = requests.get(f"{BASE_URL}/doctors/me", headers={"Authorization": f"Bearer {doctor_token}"}).json()
    doctor_id = doc_profile["id"]
    print(f"Doctor ID: {doctor_id}")

    # 2. Set Schedule (Active Now)
    print("\n--- Setting Schedule (Active) ---")
    now = datetime.datetime.utcnow()
    # Schedule for TODAY, covering NOW
    start_time = (now - datetime.timedelta(minutes=30)).strftime("%H:%M")
    end_time = (now + datetime.timedelta(minutes=30)).strftime("%H:%M")
    day_of_week = now.weekday()
    
    schedule_data = [{
        "day_of_week": day_of_week,
        "start_time": start_time,
        "end_time": end_time,
        "is_active": True
    }]
    
    res = requests.post(
        f"{BASE_URL}/doctors/schedule", 
        json=schedule_data, 
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    print(f"Set Schedule Status: {res.status_code}")
    if res.status_code != 200:
        print(res.text)

    # 3. Check Availability (Should be True)
    print("\n--- Checking Availability (Expected: True) ---")
    # Using public list or profile endpoint
    res = requests.get(f"{BASE_URL}/doctors/{doctor_id}", headers={"Authorization": f"Bearer {patient_token}"})
    data = res.json()
    print(f"Is Available: {data.get('is_available')}")
    
    # 4. Book Token (Should Succeed)
    print("\n--- Booking Token ---")
    token_data = {
        "doctor_id": doctor_id,
        "reason_for_visit": "Verification Test"
    }
    res = requests.post(
        f"{BASE_URL}/tokens/", 
        json=token_data, 
        headers={"Authorization": f"Bearer {patient_token}"}
    )
    print(f"Book Token Status: {res.status_code}")
    if res.status_code == 200:
        token = res.json()
        print(f"Token Booked: #{token['token_number']}, Slot ID: {token.get('slot_id')}")
    else:
        print(f"Booking Failed: {res.text}")

    # 5. Set Schedule (Inactive/Past)
    print("\n--- Setting Schedule (Inactive) ---")
    # Schedule for TODAY, but in the PAST
    past_start = (now - datetime.timedelta(hours=2)).strftime("%H:%M")
    past_end = (now - datetime.timedelta(hours=1)).strftime("%H:%M")
    
    schedule_data = [{
        "day_of_week": day_of_week,
        "start_time": past_start,
        "end_time": past_end,
        "is_active": True
    }]
    
    res = requests.post(
        f"{BASE_URL}/doctors/schedule", 
        json=schedule_data, 
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    print(f"Set Schedule Status: {res.status_code}")

    # 6. Check Availability (Should be False)
    print("\n--- Checking Availability (Expected: False) ---")
    res = requests.get(f"{BASE_URL}/doctors/{doctor_id}", headers={"Authorization": f"Bearer {patient_token}"})
    data = res.json()
    print(f"Is Available: {data.get('is_available')}")

    # 7. Try Booking (Should Fail)
    print("\n--- Booking Token (Expected: Fail) ---")
    # Need a new patient or just try to book (might hit 'Active Token' error first if previous was not cancelled)
    # Let's cancel the previous token first
    my_token = requests.get(f"{BASE_URL}/tokens/my-active/token", headers={"Authorization": f"Bearer {patient_token}"})
    if my_token.status_code == 200:
        token_id = my_token.json()["id"]
        requests.put(f"{BASE_URL}/tokens/{token_id}/cancel", headers={"Authorization": f"Bearer {patient_token}"})
        print("Cancelled previous token.")

    token_data = {
        "doctor_id": doctor_id,
        "reason_for_visit": "Verification Test 2"
    }
    res = requests.post(
        f"{BASE_URL}/tokens/", 
        json=token_data, 
        headers={"Authorization": f"Bearer {patient_token}"}
    )
    print(f"Book Token Status: {res.status_code}")
    if res.status_code != 200:
        print(f"Booking Failed (Expected): {res.json()['detail']}")
    else:
        print("Booking Succeeded (Unexpected!)")

if __name__ == "__main__":
    main()
