import os
import sys

sys.path.append(os.getcwd())
from database import SessionLocal
import models
import appointment_models

db = SessionLocal()

def dump_all_shibis():
    try:
        users = db.query(models.User).all()
        for u in users:
            profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == u.id).first()
            name = profile.full_name if profile else ""
            if 'shibi' in u.email.lower() or 'shibi' in name.lower():
                print(f"User ID: {u.id}, Email: {u.email}, Role: {u.role}, DOB: {profile.date_of_birth if profile else 'NO PROFILE'}")
    finally:
        db.close()

if __name__ == "__main__":
    dump_all_shibis()
