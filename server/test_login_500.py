import requests

data = {'username': 'shibis@gmail.com', 'password': 'admin123'}
try:
    response = requests.post('http://localhost:8000/token', data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
