import requests

BASE_URL = "https://localhost:8000"
VERIFY_SSL = False

def test_login(email, password):
    print(f"Attempting login for {email} with password '{password}'...")
    try:
        payload = {
            "username": email,
            "password": password
        }
        res = requests.post(f"{BASE_URL}/token", data=payload, verify=VERIFY_SSL, timeout=5)
        
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")
        
        if res.status_code == 200:
            print("Login SUCCESS!")
        else:
            print("Login FAILED.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    # Test with the password we reset it to
    test_login("saneetta@gmail.com", "password")
    
    # Test with a potential alternative if user changed it back or something
    test_login("saneetta@gmail.com", "securepassword")
