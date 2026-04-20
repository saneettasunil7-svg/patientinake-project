from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add server directory to path to import models
sys.path.append(os.path.abspath('d:/patientintake/server'))
import models

DATABASE_URL = "sqlite:///d:/patientintake/server/patientintake.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def cleanup_doctor():
    db = SessionLocal()
    try:
        # Delete by email
        user = db.query(models.User).filter(models.User.email == "saneetta@gmail.com").first()
        if user:
            print(f"Found user: {user.email} (ID: {user.id})")
            # All relationships should cascade or be deleted manually
            # Delete associated DoctorProfile if it exists
            profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == user.id).first()
            if profile:
                print(f"Found profile for: {profile.full_name}")
                db.delete(profile)
            
            db.delete(user)
            print("Successfully deleted user and profile.")
        else:
            print("User saneetta@gmail.com not found. Checking profile name.")
            profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.full_name == "Dr. Saneetta").first()
            if profile:
                print(f"Found profile by name: {profile.full_name}")
                db.delete(profile)
                print("Successfully deleted profile by name.")
            else:
                print("No records found for Saneetta.")

        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_doctor()
