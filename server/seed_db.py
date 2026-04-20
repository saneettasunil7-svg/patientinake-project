from database import SessionLocal, engine
import models
from auth import get_password_hash

# Create tables
models.Base.metadata.create_all(bind=engine)

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
    else:
        print(f"User already exists: {email}")

try:
    # Create Doctor
    create_user_if_not_exists("doctor@example.com", "doctor123", "doctor", "Dr. SMITH", "Cardiologist")
    
    # Create Patient
    create_user_if_not_exists("patient@example.com", "patient123", "patient", "John Doe")

    # Create Admin
    create_user_if_not_exists("admin@example.com", "admin123", "admin", "Admin User")

    db.commit()
    print("Database seeded successfully!")
except Exception as e:
    print(f"Error seeding database: {e}")
    db.rollback()
finally:
    db.close()
