
# Script to verify users
import sys
import os

# Add 'server' directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

try:
    from database import SessionLocal
    from models import User
    
    db = SessionLocal()

    print("--- Doctor Verification ---")
    doctors = db.query(User).filter(User.role == 'doctor').all()
    if not doctors:
        print("No doctors found in database.")
    else:
        print(f"Found {len(doctors)} doctors:")
        for u in doctors:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")

    db.close()

except ImportError as e:
    print(f"Import Error: {e}")
    print(f"sys.path: {sys.path}")
except Exception as e:
    print(f"An error occurred: {e}")
