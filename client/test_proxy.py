import requests

url = "https://127.0.0.1:3000/api/token"
data = {
    "username": "admin@mediconnect.com",
    "password": "admin123"
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, data=data, timeout=10, verify=False)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
