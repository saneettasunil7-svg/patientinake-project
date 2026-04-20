import requests
import warnings
from requests.packages.urllib3.exceptions import InsecureRequestWarning

warnings.simplefilter('ignore', InsecureRequestWarning)

BASE_URL = "https://127.0.0.1:8000"

def list_doctors():
    print(f"Fetching doctors from {BASE_URL}...")
    try:
        # We need a token to fetch doctors usually, or is it public? 
        # Checking auth logic: public endpoint? 
        # Doctor routes usually require auth or at least valid token.
        # Let's login as admin or just try public access if available, otherwise patient login.
        
        # Login as patient first to get token
        auth_res = requests.post(f"{BASE_URL}/token", data={"username": "patient@example.com", "password": "password123"}, verify=False)
        if auth_res.status_code != 200:
            print("Login failed, trying public access (if allowed)...")
            headers = {}
        else:
            token = auth_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("Logged in as patient.")

        response = requests.get(f"{BASE_URL}/doctors/", headers=headers, verify=False)
        
        if response.status_code == 200:
            doctors = response.json()
            print(f"\nFound {len(doctors)} doctors:")
            found_saneetta = False
            for doctor in doctors:
                is_saneetta = "saneetta" in doctor.get('full_name', '').lower() or "saneetta" in doctor.get('email', '').lower()
                marker = " <--- FOUND SANEETTA" if is_saneetta else ""
                if is_saneetta: found_saneetta = True
                
                print(f" - ID: {doctor['id']}")
                print(f"   Name: {doctor['full_name']}")
                print(f"   Email: {doctor.get('email', 'N/A')}")
                print(f"   Specialization: {doctor.get('specialization', 'N/A')}")
                print(f"   Available: {doctor.get('is_available', False)}")
                print(f"   {marker}")
                print("-" * 20)
                
            if not found_saneetta:
                print("WARNING: 'saneetta' not found in the list!")
        else:
            print(f"Failed to fetch doctors: {response.status_code} {response.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_doctors()
