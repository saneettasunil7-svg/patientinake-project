import urllib.request
import json
import uuid

def test_endpoint():
    try:
        # First login to get a token
        data = 'username=priya%40gmail.com&password=admin123'.encode('utf-8')
        req = urllib.request.Request('http://localhost:8000/token', data=data, method='POST')
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            token = res_data['access_token']
        
        print("Got token:", token[:10] + "...")
        
        # Now hit the metrics endpoint
        req = urllib.request.Request('http://localhost:8000/tokens/metrics/me', method='GET')
        req.add_header('Authorization', f'Bearer {token}')
        with urllib.request.urlopen(req) as response:
            print("Status:", response.status)
            print("Body:", response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print("HTTPError:", e.code)
        print("Headers:", e.headers)
        print("Body:", e.read().decode('utf-8') if hasattr(e, 'read') else '')
    except Exception as e:
        print("Exception:", e)

test_endpoint()
