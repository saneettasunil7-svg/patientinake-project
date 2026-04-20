
# Script to verify users
import sys
import os

# Add parent directory of 'server' to sys.path
# This script is in d:/patientintake/server/verify_users.py
# We want to be able to import 'database' and 'models' as if we were in the 'server' package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import SessionLocal
    from models import User

    db = SessionLocal()

    print("--- User Verification ---")
    users = db.query(User).all()
    if not users:
        print("No users found in database.")
    else:
        print(f"Found {len(users)} users:")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")
            # print(f"Hashed Password: {u.hashed_password}") # Optional: check if password looks hashed
    
    db.close()

except ImportError as e:
    print(f"Import Error: {e}")
    print(f"sys.path: {sys.path}")
except Exception as e:
    print(f"An error occurred: {e}")
