import os
import sys

sys.path.append(os.getcwd())
import asyncio
from database import SessionLocal
import models
from token_routes import get_queue

db = SessionLocal()

async def test_all_queues():
    try:
        doctors = db.query(models.User).filter(models.User.role == "doctor").all()
        for d in doctors:
            data = await get_queue(doctor_id=d.id, db=db, current_user=d)
            for t in data:
                if 'shibi' in t.patient_name.lower():
                    print(f"Token {t.id} - Doc: {d.email} - Patient: {t.patient_name} - DOB: {t.date_of_birth} - Phone: {t.phone_number}")
    except Exception as e:
        print(f"Exception: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_all_queues())
