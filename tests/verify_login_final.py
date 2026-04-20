import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://localhost:8000"
VERIFY_SSL = False

def test_login(email, password):
    print(f"Testing login for {email} with '{password}'...")
    try:
        payload = {"username": email, "password": password}
        res = requests.post(f"{BASE_URL}/token", data=payload, verify=VERIFY_SSL, timeout=5)
        
        if res.status_code == 200:
            token = res.json().get("access_token")
            print("  [SUCCESS] Login successful!")
            
            # Also verify /users/me to check role
            headers = {"Authorization": f"Bearer {token}"}
            me_res = requests.get(f"{BASE_URL}/users/me", headers=headers, verify=VERIFY_SSL)
            if me_res.status_code == 200:
                user = me_res.json()
                print(f"  [INFO] User ID: {user['id']}, Role: {user['role']}")
            else:
                print(f"  [WARNING] Could not fetch user details: {me_res.status_code}")
                
        else:
            print(f"  [FAILED] Status: {res.status_code}, Response: {res.text}")

    except Exception as e:
        print(f"  [ERROR] {e}")

if __name__ == "__main__":
    test_login("saneetta@gmail.com", "password")
