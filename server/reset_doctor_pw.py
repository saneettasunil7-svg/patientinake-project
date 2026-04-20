
import sys
import os

# Add 'server' directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

try:
    from database import SessionLocal
    from models import User
    from auth import get_password_hash
    
    db = SessionLocal()

    email = "doctor@clinic.com"
    password = "password123"
    
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"Resetting password for {email}...")
        user.hashed_password = get_password_hash(password)
        db.commit()
        print("Password reset successful.")
    else:
        print(f"User {email} not found.")

    db.close()

except Exception as e:
    print(f"An error occurred: {e}")
