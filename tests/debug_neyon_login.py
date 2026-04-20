from database import SessionLocal
import models
import auth

def debug_login(email):
    db = SessionLocal()
    try:
        print(f"Checking user: {email}")
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print("User not found.")
            return
        
        print(f"User ID: {user.id}, Role: {user.role}, Active: {user.is_active}")
        
        # Check profiles
        if user.role == "patient":
            profile = db.query(models.PatientProfile).filter(models.PatientProfile.user_id == user.id).first()
            print(f"Patient Profile: {profile.full_name if profile else 'NOT FOUND'}")
        elif user.role == "doctor":
            profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == user.id).first()
            print(f"Doctor Profile: {profile.full_name if profile else 'NOT FOUND'}")
            
    except Exception as e:
        print(f"Error during debugging: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_login("neyon@gmail.com")
