import os
import sys

sys.path.append(os.getcwd())
from database import SessionLocal
import models

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.email == "shibis@gmail.com").first()
    if user:
        profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == user.id).first()
        if profile:
            print("Profile found:")
            print(f"Name: {profile.full_name}")
            print(f"DOB: {profile.date_of_birth}")
            print(f"Phone: {profile.phone_number}")
            print(f"History: {profile.medical_history_summary}")
            print(f"UPI: {profile.upi_id}")
            print(f"Bank: {profile.bank_name}")
            print(f"Account: {profile.account_number}")
            print(f"IFSC: {profile.ifsc_code}")
        else:
            print("No profile found for user.")
    else:
        print("User not found.")
finally:
    db.close()
