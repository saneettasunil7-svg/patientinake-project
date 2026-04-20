import os
import sys

sys.path.append(os.getcwd())
from database import SessionLocal
import models
import appointment_models

db = SessionLocal()

def check_recent_tokens():
    try:
        # Get the 5 most recent tokens
        tokens = db.query(appointment_models.Token).order_by(appointment_models.Token.id.desc()).limit(5).all()
        for t in tokens:
            patient = db.query(models.User).filter(models.User.id == t.patient_id).first()
            patient_name = patient.email if patient else 'Unknown'
            
            profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == t.patient_id).first()
            
            print(f"Token {t.id} - Patient ID: {t.patient_id} ({patient_name})")
            if profile:
                print(f"  DOB: {profile.date_of_birth}")
                print(f"  Phone: {profile.phone_number}")
                print(f"  History: {profile.medical_history_summary}")
                print(f"  UPI: {profile.upi_id}")
            else:
                print("  [NO PATIENT PROFILE FOUND]")
    finally:
        db.close()

if __name__ == "__main__":
    check_recent_tokens()
