from database import SessionLocal, engine
import models
from auth import get_password_hash

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

def create_user(email, password, role, name, specialization=None):
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        print(f"✅ User {email} already exists. Updating password to {password}...")
        existing.hashed_password = get_password_hash(password)
        db.commit()
        return

    hashed = get_password_hash(password)
    user = models.User(email=email, hashed_password=hashed, role=role, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    if role == "doctor":
        profile = models.DoctorProfile(user_id=user.id, full_name=name, specialization=specialization or "General")
        db.add(profile)
    elif role == "patient":
        profile = models.PatientProfile(user_id=user.id, full_name=name)
        db.add(profile)
    
    db.commit()
    print(f"✅ Created {role}: {email} / {password}")

# Create/Update standard test users
create_user("doctor@clinic.com", "doctor123", "doctor", "Dr. Test", "Cardiology")
create_user("patient@clinic.com", "patient123", "patient", "Test Patient")
create_user("admin@clinic.com", "admin123", "admin", "Admin User")

# Create the user the patient is actually trying to use
create_user("patient@example.com", "password123", "patient", "Example Patient")

db.close()
