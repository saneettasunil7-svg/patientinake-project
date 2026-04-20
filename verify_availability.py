
import sys
import os

# Add server directory to path
sys.path.append(os.path.join(os.getcwd(), 'server'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from server.database import SQLALCHEMY_DATABASE_URL
from server import models, appointment_models

# Override database URL if needed (using default from database.py which is sqlite:///./patientintake.db)
# We need to make sure we point to the right file.
# The server is running in c:\anti\patientintake\patientintake\server
# So the db file should be c:\anti\patientintake\patientintake\server\patientintake.db

DB_PATH = os.path.join(os.getcwd(), 'server', 'patientintake.db')
DATABASE_URL = f"sqlite:///{DB_PATH}"

print(f"Connecting to database at: {DATABASE_URL}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def verify_availability():
    print("\n--- Verifying Doctor Availability ---")
    
    # 1. Get a doctor
    doctor = db.query(models.User).filter(models.User.role == "doctor").first()
    if not doctor:
        print("No doctors found in database!")
        return

    print(f"Checking availability for Doctor ID: {doctor.id} ({doctor.email})")

    # 2. Check availability record
    av_record = db.query(appointment_models.DoctorAvailability).filter(
        appointment_models.DoctorAvailability.doctor_id == doctor.id
    ).first()

    if av_record:
        print(f"Found Availability Record: ID={av_record.id}, Available={av_record.is_available}, Updated={av_record.last_updated}")
    else:
        print("No Availability Record found for this doctor.")

    # 3. Simulate Toggle (Optional - careful not to mess up user's state too much, but for debugging we need to see if it saves)
    # We won't write, just read for now. If user says "even if doctor makes himself online", a record should exist and be True.
    
    # Let's list all availability records
    all_av = db.query(appointment_models.DoctorAvailability).all()
    print(f"\nTotal Availability Records: {len(all_av)}")
    for av in all_av:
        print(f" - DoctorID: {av.doctor_id}, Available: {av.is_available}")

if __name__ == "__main__":
    try:
        verify_availability()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()
