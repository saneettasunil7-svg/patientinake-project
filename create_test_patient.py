
# Script to create test patient
import sys
import os

# Add 'server' directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

try:
    from database import SessionLocal
    from models import User, PatientProfile, UserRole
    from auth import get_password_hash
    
    db = SessionLocal()

    email = "patient@example.com"
    password = "password123"
    
    # Check if user exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"User {email} already exists.")
    else:
        print(f"Creating user {email}...")
        hashed_pw = get_password_hash(password)
        new_user = User(
            email=email,
            hashed_password=hashed_pw,
            role=UserRole.patient
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create profile
        profile = PatientProfile(user_id=new_user.id, full_name="John Doe")
        db.add(profile)
        db.commit()
        print(f"User created successfully. ID: {new_user.id}")

    db.close()

except ImportError as e:
    print(f"Import Error: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
