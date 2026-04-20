from database import SessionLocal
import models
from auth import verify_password
import sys

db = SessionLocal()
email = "admin@clinic.com"
password = "admin123"

try:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        print(f"User {email} not found.")
        sys.exit(1)
    
    print(f"User: {user.email}")
    print(f"Stored Hash: {user.hashed_password}")
    
    is_valid = verify_password(password, user.hashed_password)
    print(f"Verification Result for '{password}': {is_valid}")
    
finally:
    db.close()
