import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://localhost:8000"

def test_flow():
    print("Testing Ambulance Endpoints...")

    import random
    r_agency = requests.post(f"{BASE_URL}/ambulance/agencies", json={
        "name": "Global EMT Services",
        "license_number": f"LIC-{random.randint(100000,999999)}",
        "region": "Downtown",
        "is_verified": True,
        "latitude": 34.0522,
        "longitude": -118.2437
    }, verify=False)
    
    agency_id = None
    if r_agency.status_code == 200:
        agency_id = r_agency.json()['id']
        print(f"Created Agency ID: {agency_id}")
    else:
        print(f"Agency might exist or error: {r_agency.text}")
        r_list = requests.get(f"{BASE_URL}/ambulance/agencies", verify=False)
        if r_list.status_code == 200 and len(r_list.json()) > 0:
            agency_id = r_list.json()[0]['id']
            print(f"Using existing agency: {agency_id}")

    if not agency_id:
        return

    import random
    r_unit = requests.post(f"{BASE_URL}/ambulance/units", json={
        "driver_name": "Jane Driver",
        "phone_number": "+198765432",
        "vehicle_plate": f"AMB-{agency_id}-TEST-{random.randint(100,999)}",
        "status": "Available",
        "agency_id": agency_id
    }, verify=False)
    print(f"Unit Create Status: {r_unit.status_code}")

    r_nearby = requests.post(f"{BASE_URL}/ambulance/nearby", json={
        "lat": 34.0525,
        "lng": -118.2435,
        "radius_km": 10.0
    }, verify=False)
    
    if r_nearby.status_code == 200:
        data = r_nearby.json()
        print(f"Nearby API Success. Found {len(data)} agencies.")
        for a in data:
            print(f"- {a['name']}: {a.get('available_units_count')} units available")
    else:
        print(f"Nearby API Failed: {r_nearby.text}")

if __name__ == "__main__":
    test_flow()
