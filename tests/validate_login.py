import requests
import urllib3

# Disable SSL warnings for self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://localhost:8000"

def test_login(email, password):
    print(f"Testing login for {email}...")
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data={"username": email, "password": password},
            verify=False
        )
        if response.status_code == 200:
            print(f"SUCCESS: Login successful for {email}")
            return True
        else:
            print(f"FAILED: Status {response.status_code}, Detail: {response.text}")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    # Test with known patient
    test_login("neyon@gmail.com", "password123")
    # Test with known doctor
    test_login("sai@gmail.com", "password123")
