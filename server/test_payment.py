import requests
import json

# Configuration
BASE_URL = "https://127.0.0.1:8000"
TOKEN = "YOUR_TOKEN_HERE" # Need to get a valid token from login

def test_payment(token_id):
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    url = f"{BASE_URL}/tokens/{token_id}/pay"
    print(f"Testing payment for token {token_id} at {url}")
    
    try:
        response = requests.put(url, headers=headers, verify=False)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # This script is a template. In a real test, 
    # we would first log in to get a token and create a test token.
    print("This script requires a manual token and token_id to run effectively.")
