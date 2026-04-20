import requests
import json

base_url = "http://localhost:8000"
doctor_id = 29 # Dr. Rah Mehta

def test_endpoints():
    print(f"--- Testing /public/doctors ---")
    try:
        res = requests.get(f"{base_url}/public/doctors")
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:100]}...")
    except Exception as e:
        print(f"Error: {e}")

    print(f"\n--- Testing /tokens/queue/{doctor_id} ---")
    try:
        response = requests.get(f"{base_url}/tokens/queue/{doctor_id}")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            queue = response.json()
            print(f"Found {len(queue)} patients.")
            if len(queue) > 0:
                print(json.dumps(queue[0], indent=2))
        else:
            print(f"Failed: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_endpoints()
