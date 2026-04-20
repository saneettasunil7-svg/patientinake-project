from database import SessionLocal
import models, appointment_models

def delete_user(user_id):
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        print(f"Deleting User {user.id} ({user.email}, Role: {user.role})...")
        db.delete(user)
        db.commit()
        print("User deleted successfully.")
    else:
        print(f"User {user_id} not found.")
    db.close()

if __name__ == "__main__":
    delete_user(7)
