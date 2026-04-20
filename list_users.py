
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'server'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from server import models

DB_PATH = os.path.join(os.getcwd(), 'server', 'patientintake.db')
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def list_users():
    users = db.query(models.User).all()
    print(f"Found {len(users)} users:")
    for u in users:
        print(f" - ID: {u.id}, Email: {u.email}, Role: {u.role}")

if __name__ == "__main__":
    list_users()
