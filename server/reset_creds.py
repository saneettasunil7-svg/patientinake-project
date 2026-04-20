from database import SessionLocal
import models
from auth import get_password_hash

def reset_test_creds():
    db = SessionLocal()
    try:
        creds = [
            ("admin@clinic.com", "admin123", "admin", "Admin User"),
            ("doctor@clinic.com", "doctor123", "doctor", "Dr. Test"),
            ("patient@clinic.com", "patient123", "patient", "Test Patient")
        ]
        
        for email, password, role, name in creds:
            user = db.query(models.User).filter(models.User.email == email).first()
            hashed = get_password_hash(password)
            
            if user:
                print(f"Updating {email}...")
                user.hashed_password = hashed
                user.role = role
                user.is_active = True
            else:
                print(f"Creating {email}...")
                user = models.User(email=email, hashed_password=hashed, role=role, is_active=True)
                db.add(user)
                db.commit()
                db.refresh(user)
                
                if role == "doctor":
                    profile = models.DoctorProfile(user_id=user.id, full_name=name, specialization="Emergency")
                    db.add(profile)
                elif role == "patient":
                    profile = models.PatientProfile(user_id=user.id, full_name=name)
                    db.add(profile)
            
            db.commit()
        print("✅ Test credentials reset successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    reset_test_creds()
