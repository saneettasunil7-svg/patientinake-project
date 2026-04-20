import os
import sys

sys.path.append(os.getcwd())
import requests
from database import SessionLocal
import models
import auth

db = SessionLocal()
try:
    # Authenticate as Doctor (anna@gmail.com)
    doctor = db.query(models.User).filter(models.User.email == "anna@gmail.com").first()
    if doctor:
        access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": doctor.email, "role": doctor.role}, expires_delta=access_token_expires
        )
        
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"http://localhost:8000/tokens/queue/{doctor.id}", headers=headers)
        
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print("Raw JSON Data:")
        for t in data:
            if 'shibi' in t.get('patient_name', '').lower():
                print(f"Shibi Token:")
                print(f"DOB: {t.get('date_of_birth')}")
                print(f"Phone: {t.get('phone_number')}")
                print(f"UPI ID: {t.get('upi_id')}")
                print(f"Keys in JSON: {list(t.keys())}")
    else:
        print("Doctor anna not found.")
except Exception as e:
    print(f"Exception: {e}")
finally:
    db.close()
