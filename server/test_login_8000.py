import requests
import urllib3

# Suppress insecure request warnings for self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://127.0.0.1:8000/token"
data = {
    "username": "admin@clinic.com",
    "password": "admin123"
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, data=data, timeout=10, verify=False)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
