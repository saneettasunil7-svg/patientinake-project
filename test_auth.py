import requests

BASE_URL = "https://127.0.0.1:8000"

# Dissable warnings for self-signed certs
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_register_and_login():
    email = "testpatient@example.com"
    password = "password123"
    
    # 1. Register
    print(f"Registering {email}...")
    try:
        res = requests.post(f"{BASE_URL}/users/", json={
            "email": email,
            "password": password,
            "full_name": "Test Patient",
            "role": "patient"
        }, verify=False)
        if res.status_code == 200:
            print("Registration successful!")
        else:
            print(f"Registration failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Registration error: {e}")

    # 2. Login
    print(f"Logging in {email}...")
    try:
        res = requests.post(f"{BASE_URL}/token", data={
            "username": email,
            "password": password
        }, verify=False)
        if res.status_code == 200:
            print("Login successful!")
            print(f"Token: {res.json().get('access_token')[:20]}...")
        else:
            print(f"Login failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Login error: {e}")

if __name__ == "__main__":
    test_register_and_login()
