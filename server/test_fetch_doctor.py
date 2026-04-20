import requests
import warnings
from requests.packages.urllib3.exceptions import InsecureRequestWarning

# Suppress only the single warning from urllib3 needed.
warnings.simplefilter('ignore', InsecureRequestWarning)

BASE_URL = "https://192.168.29.141:8000"

def login(email, password):
    print(f"Logging in as {email}...")
    response = requests.post(f"{BASE_URL}/token", data={"username": email, "password": password}, verify=False)
    if response.status_code == 200:
        print("Login successful")
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} {response.text}")
        return None

def main():
    token = login("patient@example.com", "password123")
    if not token:
        # Try creating the user first just in case
        print("Attempting to create patient user...")
        create_res = requests.post(f"{BASE_URL}/users/", json={
            "email": "patient@example.com",
            "password": "password123",
            "full_name": "Test Patient",
            "role": "patient"
        }, verify=False)
        if create_res.status_code == 200 or create_res.status_code == 400:
            token = login("patient@example.com", "password123")
    
    if not token:
        print("Could not get access token. Aborting.")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # List doctors
    print("\nRequesting /doctors/...")
    response = requests.get(f"{BASE_URL}/doctors/", headers=headers, verify=False)
    if response.status_code == 200:
        doctors = response.json()
        print(f"Found {len(doctors)} doctors")
        if doctors:
            first_doctor_id = doctors[0]['id']
            print(f"First doctor ID: {first_doctor_id}")
            
            # Fetch specific doctor
            print(f"\nRequesting /doctors/{first_doctor_id}...")
            detail_res = requests.get(f"{BASE_URL}/doctors/{first_doctor_id}", headers=headers, verify=False)
            if detail_res.status_code == 200:
                print("Successfully fetched doctor details!")
                print(detail_res.json())
            else:
                print(f"Failed to fetch doctor details: {detail_res.status_code}")
                print(detail_res.text)
        else:
            print("No doctors found to test detail fetch.")
            # Try to create a doctor
            print("Creating a test doctor...")
            requests.post(f"{BASE_URL}/users/", json={
                "email": "doc@example.com", 
                "password": "password123",
                "full_name": "Dr. Test",
                "role": "doctor"
            }, verify=False)
            # Login as doctor to ensure profile created? (Actually user creation creates profile)
            
    else:
        print(f"Failed to list doctors: {response.status_code} {response.text}")

if __name__ == "__main__":
    main()
