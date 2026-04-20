from sqlalchemy.orm import Session
from database import SessionLocal
import models

def list_all_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        print(f"\n{'='*60}")
        print(f"Found {len(users)} users in database:")
        print(f"{'='*60}\n")
        
        for user in users:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Role: {user.role}")
            print(f"Active: {user.is_active}")
            print(f"Password Hash: {user.hashed_password[:20]}...")
            print("-" * 60)
    finally:
        db.close()

if __name__ == "__main__":
    list_all_users()
