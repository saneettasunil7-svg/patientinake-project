import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    url = "https://127.0.0.1:8000/token"
    data = {"username": "patient@example.com", "password": "password123"}
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    print(f"Testing {url}...")
    response = requests.post(url, data=data, headers=headers, verify=False)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
