import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))

from database import SessionLocal
import appointment_models
import models

def fix_orphaned_appointments():
    db = SessionLocal()
    try:
        # Get all appointments
        appointments = db.query(appointment_models.Appointment).all()
        
        # Get valid doctors
        valid_doctors = db.query(models.User).filter(models.User.role == "doctor").all()
        if not valid_doctors:
            print("No valid doctors found in database!")
            return
            
        valid_doctor_ids = [d.id for d in valid_doctors]
        print(f"Valid doctor IDs: {valid_doctor_ids}")
        
        fixed_count = 0
        for appt in appointments:
            if appt.doctor_id not in valid_doctor_ids:
                old_id = appt.doctor_id
                # Re-assign to the first valid doctor, or distribute
                new_id = valid_doctor_ids[appt.id % len(valid_doctor_ids)]
                appt.doctor_id = new_id
                print(f"Fixed Appointment {appt.id}: Re-assigned from {old_id} to {new_id}")
                fixed_count += 1
        
        db.commit()
        print(f"Successfully fixed {fixed_count} appointments.")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_orphaned_appointments()
