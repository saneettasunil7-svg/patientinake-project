
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

def list_doctors():
    doctors = db.query(models.User).filter(models.User.role == "doctor").all()
    print(f"Found {len(doctors)} doctors:")
    for d in doctors:
        print(f" - ID: {d.id}, Email: {d.email}")

if __name__ == "__main__":
    list_doctors()
