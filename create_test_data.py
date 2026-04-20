
# Script to create test doctor and patient
import sys
import os

# Add 'server' directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

try:
    from database import SessionLocal
    from models import User, PatientProfile, DoctorProfile, UserRole
    from appointment_models import DoctorAvailability
    from auth import get_password_hash
    
    db = SessionLocal()

    # Create Doctor
    doc_email = "doctor@example.com"
    doc_password = "password123"
    
    existing_doc = db.query(User).filter(User.email == doc_email).first()
    if not existing_doc:
        print(f"Creating doctor {doc_email}...")
        hashed_pw = get_password_hash(doc_password)
        new_doc = User(
            email=doc_email,
            hashed_password=hashed_pw,
            role=UserRole.doctor
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        # Create profile
        profile = DoctorProfile(
            user_id=new_doc.id, 
            full_name="Dr. Sarah Smith",
            specialization="Cardiologist"
        )
        db.add(profile)
        
        # Create availability
        avail = DoctorAvailability(doctor_id=new_doc.id, is_available=True)
        db.add(avail)
        
        db.commit()
        print(f"Doctor created successfully. ID: {new_doc.id}")
    else:
        print(f"Doctor {doc_email} already exists.")

    # Create Patient
    pat_email = "patient@example.com"
    pat_password = "password123"
    
    existing_pat = db.query(User).filter(User.email == pat_email).first()
    if not existing_pat:
        print(f"Creating patient {pat_email}...")
        hashed_pw = get_password_hash(pat_password)
        new_pat = User(
            email=pat_email,
            hashed_password=hashed_pw,
            role=UserRole.patient
        )
        db.add(new_pat)
        db.commit()
        db.refresh(new_pat)
        
        # Create profile
        profile = PatientProfile(user_id=new_pat.id, full_name="John Doe")
        db.add(profile)
        db.commit()
        print(f"Patient created successfully. ID: {new_pat.id}")
    else:
        print(f"Patient {pat_email} already exists.")

    db.close()

except ImportError as e:
    print(f"Import Error: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
