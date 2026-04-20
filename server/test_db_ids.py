import os
import sys

sys.path.append(os.getcwd())
from database import SessionLocal
import models
import appointment_models

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.email == "shibis@gmail.com").first()
    if user:
        print(f"Shibi User ID: {user.id}")
        profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == user.id).first()
        print(f"Shibi Profile ID: {profile.id if profile else 'NONE'}")
    
    print("\nTokens containing 'shibi':")
    tokens = db.query(appointment_models.Token).all()
    for t in tokens:
        # Check if patient name or something matches
        patient = db.query(models.User).filter(models.User.id == t.patient_id).first()
        patient_email = patient.email if patient else "UNKNOWN"
        print(f"Token ID: {t.id}, Token Number: {t.token_number}, Patient ID: {t.patient_id}, Patient Email: {patient_email}")

except Exception as e:
    print(f"Exception: {e}")
finally:
    db.close()
