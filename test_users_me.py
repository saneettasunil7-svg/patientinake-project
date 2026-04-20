import requests
import urllib3
import json
import base64
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Let's login first to get a real token and then hit /users/me
try:
    # Patient login
    login_data = {"username": "patient@example.com", "password": "password123"}
    response = requests.post('https://127.0.0.1:8000/token', data=login_data, verify=False)
    
    if response.status_code == 200:
        token = response.json().get('access_token')
        print(f"Got token")
        
        # Now try /users/me
        headers = {'Authorization': f'Bearer {token}'}
        me_response = requests.get('https://127.0.0.1:8000/users/me', headers=headers, verify=False)
        print(f"Status code: {me_response.status_code}")
        print(f"Response: {me_response.text}")
    else:
        print(f"Login failed: {response.status_code} {response.text}")
        
except Exception as e:
    print(f"Error: {e}")
