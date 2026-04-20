from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import SQLALCHEMY_DATABASE_URL
from models import DoctorProfile, User

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

doctors = db.query(DoctorProfile).all()
print(f"\nTotal doctors: {len(doctors)}\n")
print("=" * 80)

for d in doctors:
    u = db.query(User).filter(User.id == d.user_id).first()
    spec = d.specialization if d.specialization else "NO DEPT"
    email = u.email if u else "N/A"
    print(f"ID: {d.id:2d} | {d.full_name:20s} | {spec:20s} | {email}")

print("=" * 80)
db.close()
