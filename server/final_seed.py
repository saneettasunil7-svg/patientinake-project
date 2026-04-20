from database import SessionLocal, engine
import models
from auth import get_password_hash

# Create tables
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed_user(email, password, role, name, specialization=None):
    email = email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        print(f"Creating user: {email}")
        hashed_password = get_password_hash(password)
        user = models.User(
            email=email,
            hashed_password=hashed_password,
            role=role,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        print(f"User already exists: {email}. Updating password...")
        user.hashed_password = get_password_hash(password)
        db.commit()

    # Ensure profile exists
    if role == "doctor":
        profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == user.id).first()
        if not profile:
            profile = models.DoctorProfile(user_id=user.id, full_name=name, specialization=specialization or "General")
            db.add(profile)
    elif role == "patient":
        profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == user.id).first()
        if not profile:
            profile = models.PatientProfile(user_id=user.id, full_name=name)
            db.add(profile)
    
    db.commit()

try:
    # Seed ALL variants of test accounts
    accounts = [
        ("admin@mediconnect.com", "admin123", "admin", "Admin MediConnect"),
        ("doctor@mediconnect.com", "doctor123", "doctor", "Dr. MediConnect", "General"),
        ("patient@mediconnect.com", "patient123", "patient", "Patient MediConnect"),
        ("admin@clinic.com", "admin123", "admin", "Admin User"),
        ("doctor@clinic.com", "doctor123", "doctor", "Dr. Clinic", "Cardiology"),
        ("patient@clinic.com", "patient123", "patient", "Patient Clinic"),
        ("admin@example.com", "admin123", "admin", "Admin Example"),
        ("doctor@example.com", "doctor123", "doctor", "Dr. Example", "Neurology"),
        ("patient@example.com", "patient123", "patient", "Patient Example"),
    ]

    for email, pw, role, name, *opt in accounts:
        spec = opt[0] if opt else None
        seed_user(email, pw, role, name, spec)

    print("✅ Database seeding complete.")
except Exception as e:
    print(f"❌ Error seeding database: {e}")
    db.rollback()
finally:
    db.close()
