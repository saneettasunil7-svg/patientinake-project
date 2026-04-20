import requests

url = "http://127.0.0.1:8001/token"
data = {
    "username": "test@example.com",
    "password": "password"
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, data=data, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
