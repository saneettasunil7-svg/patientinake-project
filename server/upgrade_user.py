from database import SessionLocal
import models, appointment_models
from datetime import datetime

def upgrade_to_doctor(user_id):
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        print(f"User {user_id} not found")
        return

    print(f"Upgrading User {user.id} ({user.email}) to DOCTOR...")
    user.role = "doctor"
    
    # Check/Create Doctor Profile
    profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == user.id).first()
    if not profile:
        profile = models.DoctorProfile(
            user_id=user.id,
            full_name="Dr. Saneetta",
            specialization="General Physician",
            is_verified=True
        )
        db.add(profile)
        print("  Created Doctor Profile.")
    else:
        print("  Doctor Profile already exists.")

    db.commit()
    print("User updated successfully.")
    db.close()

if __name__ == "__main__":
    upgrade_to_doctor(22)
