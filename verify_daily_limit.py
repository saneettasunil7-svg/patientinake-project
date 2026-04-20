import sys
import os
from datetime import datetime, date, time

# Add the server directory to sys.path
server_dir = os.path.join(os.getcwd(), 'server')
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

# Import models exactly as main.py does
from database import SessionLocal, engine
import models, appointment_models, main, schemas
from schemas import PublicBookingRequest
import random

def verify_limit():
    db = SessionLocal()
    try:
        # 1. Find a doctor
        doctor = db.query(models.User).filter(models.User.role == "doctor").first()
        if not doctor:
            print("No doctor found.")
            return

        print(f"Testing with doctor: {doctor.email} (ID: {doctor.id})")

        # 2. Clear today's tokens for this doctor
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        
        db.query(appointment_models.Token).filter(
            appointment_models.Token.doctor_id == doctor.id,
            appointment_models.Token.created_at >= today_start,
            appointment_models.Token.created_at <= today_end
        ).delete()
        db.commit()

        # 3. Create 10 tokens
        for i in range(10):
            patient_email = f"test_limit_{i}_{random.randint(1000, 9999)}@example.com"
            new_patient = models.User(email=patient_email, hashed_password="pw", role="patient")
            db.add(new_patient)
            db.flush()
            
            token = appointment_models.Token(
                patient_id=new_patient.id,
                doctor_id=doctor.id,
                token_number=i+1,
                status="waiting",
                created_at=datetime.now()
            )
            db.add(token)
        
        db.commit()
        print("Seeded 10 tokens for today.")

        # 4. Attempt 11th booking via public endpoint function
        print("Attempting 11th booking via public_book_appointment...")
        payload = PublicBookingRequest(
            first_name="Test",
            last_name="Limit",
            dob="1990-01-01",
            gender="Male",
            mobile="9999999999",
            email=f" eleventh_{random.randint(1000,9999)}@example.com",
            password="password",
            speciality="General",
            doctor_id=doctor.id,
            appointment_date=date.today().isoformat()
        )

        from fastapi import HTTPException
        try:
            main.public_book_appointment(payload, db)
            print("FAILED: 11th booking allowed!")
        except HTTPException as e:
            if e.status_code == 400 and e.detail == "no available time slot":
                print(f"SUCCESS: Caught expected error: {e.status_code} - {e.detail}")
            else:
                print(f"FAILED: Caught wrong error: {e.status_code} - {e.detail}")
        
    finally:
        db.close()

if __name__ == "__main__":
    verify_limit()
