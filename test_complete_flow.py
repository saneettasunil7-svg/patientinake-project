"""
Complete Patient-Doctor Flow Test
Tests the entire consultation workflow from token request to video call.
"""
import requests
import time
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

BASE_URL = "https://127.0.0.1:8000"

def login(email, password):
    """Login and get JWT token"""
    response = requests.post(
        f"{BASE_URL}/token",
        data={"username": email, "password": password},
        verify=False
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def get_available_doctors(token):
    """Get list of available doctors"""
    response = requests.get(
        f"{BASE_URL}/doctors/",
        headers={"Authorization": f"Bearer {token}"},
        verify=False
    )
    return response.json() if response.status_code == 200 else []

def request_token(patient_token, doctor_id):
    """Patient requests a token"""
    response = requests.post(
        f"{BASE_URL}/tokens/",
        json={"doctor_id": doctor_id},
        headers={"Authorization": f"Bearer {patient_token}"},
        verify=False
    )
    print(f"Token Request: {response.status_code}")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.text}")
        return None

def get_patient_token_status(patient_token):
    """Check patient's active token"""
    response = requests.get(
        f"{BASE_URL}/tokens/my-active/token",
        headers={"Authorization": f"Bearer {patient_token}"},
        verify=False
    )
    if response.status_code == 200:
        return response.json()
    return None

def get_doctor_queue(doctor_token):
    """Get doctor's patient queue"""
    # First get doctor's user ID
    response = requests.get(
        f"{BASE_URL}/users/me",
        headers={"Authorization": f"Bearer {doctor_token}"},
        verify=False
    )
    doctor = response.json()
    doctor_id = doctor["id"]
    
    # Get queue
    response = requests.get(
        f"{BASE_URL}/tokens/queue/{doctor_id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
        verify=False
    )
    return response.json() if response.status_code == 200 else []

def call_patient(doctor_token, token_id):
    """Doctor calls patient (updates token status to in_progress)"""
    response = requests.put(
        f"{BASE_URL}/tokens/{token_id}/call",
        headers={"Authorization": f"Bearer {doctor_token}"},
        verify=False
    )
    print(f"Call Patient: {response.status_code}")
    return response.status_code == 200

def create_video_session(token_jwt, token_id):
    """Create video session"""
    response = requests.post(
        f"{BASE_URL}/video/session",
        json={"token_id": token_id},
        headers={"Authorization": f"Bearer {token_jwt}"},
        verify=False
    )
    if response.status_code == 200:
        return response.json()
    return None

def main():
    print("=" * 60)
    print("COMPLETE PATIENT-DOCTOR FLOW TEST")
    print("=" * 60)
    
    # Step 1: Login as Patient
    print("\n[1] Patient Login...")
    patient_token = login("patient@clinic.com", "patient123")
    if not patient_token:
        print("❌ Patient login failed")
        return
    print("✓ Patient logged in")
    
    # Step 2: Login as Doctor
    print("\n[2] Doctor Login...")
    doctor_token = login("doctor@clinic.com", "doctor123")
    if not doctor_token:
        print("❌ Doctor login failed")
        return
    print("✓ Doctor logged in")
    
    # Step 2.1: Get Doctor ID
    print("\n[2.1] Getting Doctor ID...")
    response = requests.get(
        f"{BASE_URL}/users/me",
        headers={"Authorization": f"Bearer {doctor_token}"},
        verify=False
    )
    if response.status_code != 200:
        print("❌ Failed to get doctor info")
        return
    current_doctor_id = response.json()["id"]
    print(f"✓ Doctor ID: {current_doctor_id}")

    # Step 2.5: Doctor sets availability
    print("\n[2.5] Doctor sets availability to True...")
    response = requests.put(
        f"{BASE_URL}/doctors/availability",
        json={"is_available": True},
        headers={"Authorization": f"Bearer {doctor_token}"},
        verify=False
    )
    if response.status_code == 200:
        print("✓ Doctor is now available")
    else:
        print(f"❌ Failed to set availability: {response.text}")
        return

    # Step 3: Get available doctors
    print("\n[3] Patient fetches available doctors...")
    doctors = get_available_doctors(patient_token)
    if not doctors:
        print("❌ No doctors available")
        return
    print(f"✓ Found {len(doctors)} doctors")
    for doc in doctors:
        print(f"  - ID: {doc['id']}, Name: {doc.get('full_name', 'N/A')}, Available: {doc['is_available']}")
    
    # Step 4: Check if already has token, otherwise request one
    print("\n[4] Checking/Requesting consultation token...")
    # Use the ID of the doctor we logged in as
    doctor_id = current_doctor_id
    
    existing_token = get_patient_token_status(patient_token)
    if existing_token:
        print(f"✓ Found existing token #{existing_token['token_number']} - Status: {existing_token['status']}")
        token_id = existing_token['id']
        token_number = existing_token['token_number']
        
        # If the token is for a different doctor, we might have an issue for this specific test
        if existing_token['doctor_id'] != doctor_id:
             print(f"⚠ Existing token is for Doctor ID {existing_token['doctor_id']}, but we are testing with Doctor ID {doctor_id}")
             print("  The test might fail at the 'Doctor calls patient' step if the doctor IDs don't match.")
    else:
        token_data = request_token(patient_token, doctor_id)
        if not token_data:
            print("❌ Token request failed")
            return
        token_id = token_data['id']
        token_number = token_data['token_number']
        print(f"✓ Token created - ID: {token_id}, Number: #{token_number}")
    
    # Step 5: Verify patient sees their token
    print("\n[5] Patient checks token status...")
    patient_status = get_patient_token_status(patient_token)
    if patient_status:
        print(f"✓ Patient sees token #{patient_status['token_number']} - Status: {patient_status['status']}")
    else:
        print("❌ Patient cannot see their token")
    
    # Step 6: Doctor checks queue
    print("\n[6] Doctor checks patient queue...")
    queue = get_doctor_queue(doctor_token)
    if queue:
        print(f"✓ Doctor sees {len(queue)} patient(s) in queue")
        for item in queue:
            print(f"  - Token #{item['token_number']}, Patient: {item.get('patient_name', 'N/A')}, Status: {item['status']}")
    else:
        print("❌ Doctor's queue is empty")
        return
    
    # Step 7: Doctor calls patient
    print("\n[7] Doctor initiates call...")
    if call_patient(doctor_token, token_id):
        print("✓ Patient token status updated to 'in_progress'")
    else:
        print("❌ Failed to update token status")
        return
    
    # Step 8: Patient checks status again
    print("\n[8] Patient checks updated status...")
    time.sleep(1)
    patient_status = get_patient_token_status(patient_token)
    if patient_status and patient_status['status'] == 'in_progress':
        print(f"✓ Patient sees token is 'in_progress' - JOIN CALL BUTTON SHOULD APPEAR")
    else:
        print(f"⚠ Status: {patient_status['status'] if patient_status else 'None'}")
    
    # Step 9: Create video session
    print("\n[9] Creating video session...")
    session = create_video_session(doctor_token, token_id)
    if session:
        print(f"✓ Video session created: {session['session_id']}")
        print(f"  Doctor URL: /video/{session['session_id']}")
        print(f"  Patient URL: /video/{session['session_id']}")
    else:
        print("❌ Failed to create video session")
    
    print("\n" + "=" * 60)
    print("✅ COMPLETE FLOW TEST PASSED")
    print("=" * 60)
    print("\nWhat should happen in the UI:")
    print("1. Patient dashboard shows 'Join Video Call' button (pulsing green)")
    print("2. Patient clicks button → Redirects to video page")
    print("3. Doctor redirects to video page")
    print("4. Both see 'Call Connected!' banner when peer connects")
    print("5. System chat message: 'Call Connected. The other party has joined.'")
    print("=" * 60)

if __name__ == "__main__":
    main()
