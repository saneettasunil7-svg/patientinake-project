from sqlalchemy.orm import Session
from database import SessionLocal
import models
import sys

def promote_to_admin(email):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"User with email {email} not found.")
            return
        
        print(f"Current Role: {user.role}")
        user.role = "admin"
        db.commit()
        print(f"Successfully promoted {email} to ADMIN.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

def delete_user(email):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"User with email {email} not found.")
            return

        # Hard delete for cleanup if necessary, or soft delete
        # Here we do soft delete as per app logic
        user.is_active = False 
        db.commit()
        print(f"Successfully deactivated {email}.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python manage_user_role.py <action> <email>")
        print("Actions: promote, delete")
        sys.exit(1)

    action = sys.argv[1]
    email = sys.argv[2]

    if action == "promote":
        promote_to_admin(email)
    elif action == "delete":
        delete_user(email)
    else:
        print("Invalid action. Use 'promote' or 'delete'.")
