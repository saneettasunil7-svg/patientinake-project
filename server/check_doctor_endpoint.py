import requests
import warnings
from requests.packages.urllib3.exceptions import InsecureRequestWarning

warnings.simplefilter('ignore', InsecureRequestWarning)

BASE_URL = "https://127.0.0.1:8000"
DOCTOR_ID = 7 

def check_api():
    try:
        # Login
        res = requests.post(f"{BASE_URL}/token", data={
            "username": "ajay@gmail.com",
            "password": "password123"
        }, verify=False)
        
        token = res.json().get("access_token")
        if not token:
            print("LOGIN FAILED")
            return

        headers = {"Authorization": f"Bearer {token}"}
        res = requests.get(f"{BASE_URL}/doctors/{DOCTOR_ID}", headers=headers, verify=False)
        
        if res.status_code == 200:
            data = res.json()
            # Explicitly check for the key
            if "is_available" in data:
                print(f"AVAILABLE: {data['is_available']}")
            else:
                print("KEY MISSING")
        else:
            print(f"FETCH FAILED: {res.status_code}")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_api()
