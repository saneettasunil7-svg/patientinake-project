
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'server'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from server import models
from server.auth import get_password_hash

DB_PATH = os.path.join(os.getcwd(), 'server', 'patientintake.db')
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def reset_password(email, new_password):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        print(f"User {email} not found!")
        return

    print(f"Resetting password for {email}...")
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    print("Password reset successful!")

if __name__ == "__main__":
    reset_password("sai@gmail.com", "password123")
