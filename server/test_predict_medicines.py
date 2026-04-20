import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from auth import create_access_token
import models
import requests
import urllib3

urllib3.disable_warnings()

db = SessionLocal()
user = db.query(models.User).filter(models.User.email == "john@gmail.com").first()
if not user:
    print("User not found")
    sys.exit(1)

token = create_access_token(data={"sub": user.email})
print(f"Generated Token: {token[:10]}...")

res1 = requests.get(
    "https://127.0.0.1:8000/medical-records/predict-medicines?diagnosis=severe fever and cold", 
    verify=False, 
    headers={"Authorization": f"Bearer {token}"}
)
print("\nTest 1 (Fever and Cold):")
print(res1.json())

res2 = requests.get(
    "https://127.0.0.1:8000/medical-records/predict-medicines?diagnosis=type 2 diabetes checkup", 
    verify=False, 
    headers={"Authorization": f"Bearer {token}"}
)
print("\nTest 2 (Diabetes):")
print(res2.json())

res3 = requests.get(
    "https://127.0.0.1:8000/medical-records/predict-medicines?diagnosis=xyz syndrome", 
    verify=False, 
    headers={"Authorization": f"Bearer {token}"}
)
print("\nTest 3 (Unknown):")
print(res3.json())
