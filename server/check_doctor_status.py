from sqlalchemy.orm import Session
from database import SessionLocal, engine
import appointment_models, models
from datetime import datetime

def check_doctors():
    db = SessionLocal()
    doctors = db.query(models.User).filter(models.User.role == "doctor").all()
    
    print(f"Current Time: {datetime.utcnow().time()}")
    print(f"Current Weekday: {datetime.utcnow().weekday()} (0=Mon, 6=Sun)")
    
    for doctor in doctors:
        print(f"\nDoctor: {doctor.email} (ID: {doctor.id})")
        
        # Check Global Availability
        avail = db.query(appointment_models.DoctorAvailability).filter(appointment_models.DoctorAvailability.doctor_id == doctor.id).first()
        if avail:
            print(f"  Manual Avail: {avail.is_available}")
            print(f"  Unavailable Days: {avail.unavailable_days}")
        else:
            print("  No Availability Record found.")

        # Check Schedules
        schedules = db.query(appointment_models.DoctorSchedule).filter(appointment_models.DoctorSchedule.doctor_id == doctor.id).all()
        if schedules:
            print("  Schedules:")
            for s in schedules:
                print(f"    Day {s.day_of_week}: {s.start_time} - {s.end_time} (Active: {s.is_active})")
        else:
            print("  No Schedules found.")

    db.close()

if __name__ == "__main__":
    check_doctors()
