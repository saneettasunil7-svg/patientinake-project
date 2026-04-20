import requests
import json

BASE_URL = "https://localhost:8000"

def test_registration():
    payload = {
        "email": "debug_patient_1@example.com",
        "password": "securepassword",
        "role": "patient",
        "full_name": "Debug Patient",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "blood_group": "O+"
    }
    
    print(f"Sending payload: {json.dumps(payload, indent=2)}")
    
    try:
        res = requests.post(f"{BASE_URL}/users/", json=payload, timeout=5, verify=False)
        print(f"Status Code: {res.status_code}")
        try:
            print(f"Response: {res.json()}")
        except:
            print(f"Response Text: {res.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_registration()
