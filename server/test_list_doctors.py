from database import SessionLocal
import models
import doctor_routes
from fastapi import Request
from unittest.mock import MagicMock
import asyncio

async def test_list_doctors():
    db = SessionLocal()
    try:
        # Mock a patient user
        patient = db.query(models.User).filter(models.User.role == 'patient').first()
        if not patient:
            print("No patient found to test with")
            return
        
        print(f"Testing list_doctors as user: {patient.email}")
        
        # Call the route function directly
        doctors = await doctor_routes.list_doctors(db, patient)
        
        print(f"Result count: {len(doctors)}")
        for d in doctors:
            print(f" - {d['full_name']} ({d['specialization']}), Available: {d['is_available']}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_list_doctors())
