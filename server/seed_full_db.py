from database import SessionLocal, engine
import models
import appointment_models
from auth import get_password_hash
from datetime import datetime, timedelta
import random

# Create tables
models.Base.metadata.create_all(bind=engine)
appointment_models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

def create_user_if_not_exists(email, password, role, name, specialization=None):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        print(f"Creating user: {email}")
        hashed_password = get_password_hash(password)
        new_user = models.User(
            email=email,
            hashed_password=hashed_password,
            role=role,
            name=name,
            specialization=specialization,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    else:
        print(f"User already exists: {email}")
        return user

try:
    # 1. Create Users
    doc = create_user_if_not_exists("doctor@example.com", "doctor123", "doctor", "Dr. Smith", "Cardiologist")
    pat1 = create_user_if_not_exists("patient1@example.com", "patient123", "patient", "Alice Johnson")
    pat2 = create_user_if_not_exists("patient2@example.com", "patient123", "patient", "Bob Williams")
    pat3 = create_user_if_not_exists("patient3@example.com", "patient123", "patient", "Charlie Brown")
    admin = create_user_if_not_exists("admin@example.com", "admin123", "admin", "Admin User")

    # 2. Create Appointments
    print("Seeding appointments...")
    # Clear existing for clean state (optional, be careful in prod)
    # db.query(appointment_models.Appointment).delete()
    
    today = datetime.now().date()
    
    appointments = [
        # Pending
        appointment_models.Appointment(
            doctor_id=doc.id, patient_id=pat1.id, 
            appointment_date=today + timedelta(days=1), 
            status="pending", notes="Regular checkup"
        ),
        appointment_models.Appointment(
            doctor_id=doc.id, patient_id=pat2.id, 
            appointment_date=today + timedelta(days=2), 
            status="pending", notes="Follow up"
        ),
        # Completed
        appointment_models.Appointment(
            doctor_id=doc.id, patient_id=pat3.id, 
            appointment_date=today - timedelta(days=1), 
            status="completed", notes="Initial consultation"
        ),
        # Cancelled
        appointment_models.Appointment(
            doctor_id=doc.id, patient_id=pat1.id, 
            appointment_date=today - timedelta(days=2), 
            status="cancelled", notes="Patient unavailable"
        ),
    ]

    for appt in appointments:
        # Check if exists to avoid duplicates on re-run
        exists = db.query(appointment_models.Appointment).filter_by(
            doctor_id=appt.doctor_id, patient_id=appt.patient_id, appointment_date=appt.appointment_date
        ).first()
        if not exists:
            db.add(appt)

    # 3. Create Token Queue (if models exist, assuming existing schema)
    # Checking models.py for Token definition inferred from dashboard code
    # It seems Token might be in models.py or appointment_models.py. 
    # Let's check models.py content again or just try to use what we likely have.
    # The dashboard uses /tokens/queue/{user.id}, so there must be a Token model.
    
    # Attempting to find Token model dynamically or assume standard structure
    if hasattr(models, 'Token'):
        print("Seeding tokens...")
        # db.query(models.Token).delete()
        
        tokens = [
            models.Token(
                patient_id=pat1.id, doctor_id=doc.id,
                token_number=101, status="waiting",
                created_at=datetime.now()
            ),
             models.Token(
                patient_id=pat2.id, doctor_id=doc.id,
                token_number=102, status="in_progress",
                created_at=datetime.now() - timedelta(minutes=15)
            ),
             models.Token(
                patient_id=pat3.id, doctor_id=doc.id,
                token_number=103, status="completed",
                created_at=datetime.now() - timedelta(minutes=45)
            )
        ]
        
        for t in tokens:
             exists = db.query(models.Token).filter_by(token_number=t.token_number, doctor_id=t.doctor_id).first()
             if not exists:
                 db.add(t)

    db.commit()
    print("Database fully seeded with appointments and tokens!")

except Exception as e:
    print(f"Error seeding database: {e}")
    db.rollback()
finally:
    db.close()
