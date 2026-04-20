"""
Script to list all doctors and delete those without department/specialization.
"""

from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker
from database import SQLALCHEMY_DATABASE_URL
from models import User, DoctorProfile

# Create engine and session
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    db = SessionLocal()
    try:
        # Get all doctors
        all_doctors = db.query(DoctorProfile).all()
        print(f"\n{'='*70}")
        print(f"Total Doctors in Database: {len(all_doctors)}")
        print(f"{'='*70}\n")
        
        # Display all doctors
        print("All Doctors:")
        for doctor in all_doctors:
            user = db.query(User).filter(User.id == doctor.user_id).first()
            spec = doctor.specialization if doctor.specialization else "NO SPECIALIZATION"
            print(f"  ID: {doctor.id:2d} | Name: {doctor.full_name:20s} | Spec: {spec:20s} | Email: {user.email if user else 'N/A'}")
        
        # Find doctors without specialization
        doctors_to_delete = db.query(DoctorProfile).filter(
            or_(
                DoctorProfile.specialization == None,
                DoctorProfile.specialization == "",
                DoctorProfile.specialization == "null",
                DoctorProfile.specialization == "None"
            )
        ).all()
        
        if not doctors_to_delete:
            print("\n✓ All doctors have specialization/department assigned.")
            print("No doctors to delete.")
            return
        
        print(f"\n{'='*70}")
        print(f"Doctors WITHOUT Specialization/Department: {len(doctors_to_delete)}")
        print(f"{'='*70}\n")
        
        for doctor in doctors_to_delete:
            user = db.query(User).filter(User.id == doctor.user_id).first()
            print(f"  ID: {doctor.id:2d} | Name: {doctor.full_name:20s} | Email: {user.email if user else 'N/A'}")
        
        # Delete without confirmation (as per user request)
        deleted_count = 0
        print(f"\nDeleting {len(doctors_to_delete)} doctor(s)...")
        
        for doctor in doctors_to_delete:
            user = db.query(User).filter(User.id == doctor.user_id).first()
            if user:
                print(f"  ✗ Deleting: {doctor.full_name} ({user.email})")
                db.delete(user)  # Cascade delete will remove doctor profile
                deleted_count += 1
        
        db.commit()
        print(f"\n{'='*70}")
        print(f"✓ Successfully deleted {deleted_count} doctor(s) without department.")
        print(f"{'='*70}\n")
        
        # Show remaining doctors
        remaining = db.query(DoctorProfile).count()
        print(f"Remaining doctors in database: {remaining}")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
