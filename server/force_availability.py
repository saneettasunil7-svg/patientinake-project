from database import SessionLocal
import models
import appointment_models
from datetime import datetime

def make_doctors_available():
    db = SessionLocal()
    try:
        doctors = db.query(models.User).filter(models.User.role == 'doctor').all()
        print(f"Found {len(doctors)} doctors. Setting availability...")
        
        for doctor in doctors:
            avail = db.query(appointment_models.DoctorAvailability).filter(
                appointment_models.DoctorAvailability.doctor_id == doctor.id
            ).first()
            
            if not avail:
                print(f"Creating availability for {doctor.email}")
                avail = appointment_models.DoctorAvailability(
                    doctor_id=doctor.id,
                    is_available=True,
                    last_updated=datetime.utcnow()
                )
                db.add(avail)
            else:
                print(f"Updating availability for {doctor.email}")
                avail.is_available = True
                avail.last_updated = datetime.utcnow()
        
        db.commit()
        print("All doctors are now marked as available.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    make_doctors_available()
