from database import SessionLocal
import models, appointment_models

def check_users():
    db = SessionLocal()
    users = db.query(models.User).filter(models.User.email.like("%aashone%")).all()
    print(f"Total Matches: {len(users)}")
    for u in users:
        print("---")
        print(f"ID: {u.id}")
        print(f"Email: {u.email}")
        print(f"Role: {u.role}")
    db.close()

if __name__ == "__main__":
    check_users()
