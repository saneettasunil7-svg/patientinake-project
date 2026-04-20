import os
os.environ["DATABASE_URL"] = "sqlite:///./patientintake.db"
from database import SessionLocal
import models

db = SessionLocal()
current_user = db.query(models.User).filter(models.User.role == 'doctor').first()

sender_ids = db.query(models.Message.sender_id).filter(models.Message.receiver_id == current_user.id).distinct().all()
receiver_ids = db.query(models.Message.receiver_id).filter(models.Message.sender_id == current_user.id).distinct().all()

unique_ids = set([r[0] for r in sender_ids] + [r[0] for r in receiver_ids])

contacts = []
for uid in unique_ids:
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        continue
        
    profile = None
    if user.role == "patient":
        profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == uid).first()
    elif user.role == "doctor":
        profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == uid).first()
        
    contacts.append({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": profile.full_name if profile else user.email.split('@')[0]
    })
    
print("Contacts count:", len(contacts))
