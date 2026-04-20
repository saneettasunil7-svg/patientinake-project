from sqlalchemy.orm import Session
from database import SessionLocal
import models

def list_doctors():
    db: Session = SessionLocal()
    try:
        doctors = db.query(models.User).filter(models.User.role == "doctor").all()
        print(f"Total Doctors Found: {len(doctors)}")
        for doctor in doctors:
            profile = doctor.doctor_profile
            print(f"ID: {doctor.id} | Name: {profile.full_name if profile else 'N/A'} | Email: {doctor.email} | Active: {doctor.is_active} | Verified: {getattr(profile, 'is_verified', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_doctors()
