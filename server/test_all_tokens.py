import os
import sys
sys.path.append(os.getcwd())
import asyncio
from database import SessionLocal
import models
import appointment_models

db = SessionLocal()

def dump_all_tokens():
    try:
        tokens = db.query(appointment_models.Token).all()
        for t in tokens:
            patient = db.query(models.User).filter(models.User.id == t.patient_id).first()
            patient_name = patient.email if patient else 'Unknown'
            
            doctor = db.query(models.User).filter(models.User.id == t.doctor_id).first()
            doctor_name = doctor.email if doctor else 'Unknown'
            
            if 'shibi' in patient_name:
                print(f"Token {t.id} - Doc: {doctor_name} - Patient: {patient_name}")
    finally:
        db.close()

if __name__ == "__main__":
    dump_all_tokens()
