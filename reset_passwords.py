import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))
from database import SessionLocal
from models import User
from auth import get_password_hash

db = SessionLocal()

users = db.query(User).all()
for u in users:
    # We will reset all patients to '123456', all doctors to '123456', admin to 'admin123'
    if u.role == 'admin':
        u.hashed_password = get_password_hash("admin123")
        print(f"Reset {u.role} {u.email} to 'admin123'")
    else:
        # If it's siya@gmail.com, set to 1234 as in the screenshot
        if u.email == 'siya@gmail.com':
            u.hashed_password = get_password_hash("1234")
            print(f"Reset {u.role} {u.email} to '1234'")
        else:
            u.hashed_password = get_password_hash("123456")
            print(f"Reset {u.role} {u.email} to '123456'")

db.commit()
db.close()
