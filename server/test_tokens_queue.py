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
        found = False
        for d in doctors:
            data = await get_queue(doctor_id=d.id, db=db, current_user=d)
            for t in data:
                if 'shibi' in t.patient_name.lower():
                    print(f"Found in Doc {d.email} queue:")
                    print(f"DOB: {t.date_of_birth}")
                    print(f"Phone: {t.phone_number}")
                    print(f"UPI ID: {t.upi_id}")
                    found = True
        if not found:
            print("Shibi's tokens were not found in any doctor's queue.")
    except Exception as e:
        print(f"Exception: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_all_queues())
