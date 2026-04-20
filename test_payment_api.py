import requests
import urllib3
import traceback

urllib3.disable_warnings()
base = 'https://127.0.0.1:8000'

def test_flow():
    try:
        p_token = requests.post(base+'/token', data={'username': 'patient@clinic.com', 'password': 'patient123'}, verify=False).json()['access_token']
        d_token = requests.post(base+'/token', data={'username': 'doctor@clinic.com', 'password': 'doctor123'}, verify=False).json()['access_token']
        
        requests.put(base+'/doctors/availability', json={'is_available': True}, headers={'Authorization': f'Bearer {d_token}'}, verify=False)
        d_id = requests.get(base+'/users/me', headers={'Authorization': f'Bearer {d_token}'}, verify=False).json()['id']
             
        # Fetch active token instead of create
        q_req = requests.get(f'{base}/tokens/my-active/token', headers={'Authorization': f'Bearer {p_token}'}, verify=False)
        if q_req.status_code == 200:
            tid = q_req.json().get('id')
            print(f"USING active token: {tid}")
        else:
            token_req = requests.post(base+'/tokens/', json={'doctor_id': d_id}, headers={'Authorization': f'Bearer {p_token}'}, verify=False)
            if token_req.status_code != 200:
                 print("Create Token Failed:", token_req.status_code, token_req.text)
                 return
            tid = token_req.json().get('id')
            print(f"Created token: {tid}")
        
        pay_req = requests.put(f'{base}/tokens/{tid}/pay', headers={'Authorization': f'Bearer {p_token}'}, verify=False)
        print(f"Payment Status: {pay_req.status_code}")
        
        rcpt = requests.get(f'{base}/tokens/{tid}/receipt', headers={'Authorization': f'Bearer {p_token}'}, verify=False)
        print(f"Receipt Status: {rcpt.status_code}")
        print("Receipt Body:", rcpt.text)
            
    except Exception as e:
        print("Exception:", e)
        traceback.print_exc()

if __name__ == '__main__':
    test_flow()
