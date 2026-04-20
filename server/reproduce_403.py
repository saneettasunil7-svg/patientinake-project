import requests, urllib3, warnings
warnings.filterwarnings('ignore', message='Unverified HTTPS request')
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
BASE_URL = 'https://127.0.0.1:8000'

def test_token_request(email, password):
    print(f"\nTesting with {email}...")
    try:
        # Login
        res = requests.post(f'{BASE_URL}/token', data={'username': email, 'password': password}, verify=False, timeout=5)
        if res.status_code != 200:
            print(f"Login failed: {res.status_code} {res.text}")
            return
        
        token = res.json().get('access_token')
        
        # Get doctors list to pick one
        res = requests.get(f'{BASE_URL}/admin/doctors', headers={'Authorization': f'Bearer {token}'}, verify=False, timeout=5)
        if res.status_code == 200:
            doctors = res.json()
            if not doctors:
                print("No doctors found")
                return
            doctor_id = doctors[0]['id']
        else:
            # Fallback for patients who can't access /admin/doctors
            # Most patients use different endpoint. Let's try doctor_id=5 which we know exists
            doctor_id = 5
            
        # Request token
        res = requests.post(
            f'{BASE_URL}/tokens/', 
            headers={'Authorization': f'Bearer {token}'},
            json={'doctor_id': doctor_id, 'reason_for_visit': 'Test reproduction'},
            verify=False, 
            timeout=5
        )
        print(f"Token Request Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    # Test with a patient
    test_token_request('test@test.com', 'test') # Common credential in this app
    # Test with an admin (should fail with 403)
    test_token_request('tadm@ex.com', 'pw')
