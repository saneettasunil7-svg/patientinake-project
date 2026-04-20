from database import SessionLocal
from models import User

db = SessionLocal()
email_to_check = "ajay@gmail.com"
typo_email = "ajya@gmail.com"

print(f"Checking for {email_to_check}...")
user = db.query(User).filter(User.email == email_to_check).first()
if user:
    print(f"FOUND: {user.email}")
else:
    print(f"NOT FOUND: {email_to_check}")

print(f"Checking for suspected typo {typo_email}...")
typo_user = db.query(User).filter(User.email == typo_email).first()
if typo_user:
    print(f"FOUND TYPO: {typo_user.email}")
else:
    print(f"NOT FOUND: {typo_email}")

all_users = db.query(User).all()
print(f"Total Users: {len(all_users)}")
for u in all_users[-5:]: # Print last 5
    print(f"  - {u.email}")
