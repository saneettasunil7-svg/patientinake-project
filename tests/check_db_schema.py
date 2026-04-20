from database import SessionLocal
import models

def check_db():
    db = SessionLocal()
    try:
        # Try to fetch one user and access profile_photo
        user = db.query(models.User).first()
        if user:
            print(f"User found: {user.email}")
            print(f"Profile photo: {user.profile_photo}")
        else:
            print("No users found in database.")
    except Exception as e:
        print(f"Error accessing User table: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
