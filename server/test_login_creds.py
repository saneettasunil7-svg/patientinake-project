import sys
import requests

email = sys.argv[1]
password = sys.argv[2]
data = {'username': email, 'password': password}

try:
    response = requests.post('http://localhost:8000/token', data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
