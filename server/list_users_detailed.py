from database import SessionLocal
import models

db = SessionLocal()
try:
    users = db.query(models.User).all()
    if not users:
        print("No users found in database.")
    for user in users:
        print(f"ID: {user.id}, Email: {user.email}, Role: {user.role}, Hashed PW: {user.hashed_password[:20]}...")
finally:
    db.close()
