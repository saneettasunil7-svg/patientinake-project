"""
Delete doctors without department/specialization.
This version manually deletes both DoctorProfile and User records.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import SQLALCHEMY_DATABASE_URL
from models import User, DoctorProfile

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Find doctors without valid specialization
    doctors_to_delete = db.query(DoctorProfile).filter(
        (DoctorProfile.specialization == None) |
        (DoctorProfile.specialization == "") |
        (DoctorProfile.specialization == "None") |
        (DoctorProfile.specialization == "null")
    ).all()
    
    print(f"\nFound {len(doctors_to_delete)} doctor(s) without department/specialization:\n")
    
    deleted_count = 0
    for doctor in doctors_to_delete:
        user = db.query(User).filter(User.id == doctor.user_id).first()
        print(f"Deleting: {doctor.full_name} (ID: {doctor.id}, Email: {user.email if user else 'N/A'}, Spec: '{doctor.specialization}')")
        
        # Delete doctor profile first
        db.delete(doctor)
        
        # Then delete the user
        if user:
            db.delete(user)
        
        deleted_count += 1
    
    db.commit()
    print(f"\n✓ Successfully deleted {deleted_count} doctor(s)!")
    
    # Show remaining doctors
    remaining = db.query(DoctorProfile).all()
    print(f"\nRemaining doctors: {len(remaining)}")
    for d in remaining:
        print(f"  - {d.full_name} ({d.specialization})")
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
