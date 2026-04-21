"""
seed_supabase_doctors.py
------------------------
Run this ONCE to seed test doctors into your Supabase database.
Usage: python seed_supabase_doctors.py <SUPABASE_DATABASE_URL>

Example:
  python seed_supabase_doctors.py "postgresql://postgres.xxxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

Or set DATABASE_URL env var and just run: python seed_supabase_doctors.py
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ── Get connection string ──────────────────────────────────────────────────────
DB_URL = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("DATABASE_URL", "")

if not DB_URL:
    print("ERROR: Provide DATABASE_URL as argument or env var")
    print("  python seed_supabase_doctors.py 'postgresql://...'")
    sys.exit(1)

if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)
if "sslmode" not in DB_URL:
    sep = "&" if "?" in DB_URL else "?"
    DB_URL += f"{sep}sslmode=require"

engine = create_engine(DB_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
db = Session()

# ── Password hash helper ───────────────────────────────────────────────────────
try:
    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["argon2"], deprecated="auto")
    hashed = pwd.hash("Doctor@123")
except ImportError:
    # Fallback: use bcrypt if argon2 not installed
    import bcrypt
    hashed = bcrypt.hashpw(b"Doctor@123", bcrypt.gensalt()).decode()

print(f"Using database: {DB_URL[:60]}...")
print()

# ── Test doctors data ──────────────────────────────────────────────────────────
DOCTORS = [
    {"email": "dr.cardio@hospital.com",  "name": "Dr. Arjun Sharma",    "spec": "Cardiology"},
    {"email": "dr.neuro@hospital.com",   "name": "Dr. Priya Menon",     "spec": "Neurology"},
    {"email": "dr.ortho@hospital.com",   "name": "Dr. Rajesh Kumar",    "spec": "Orthopaedics"},
    {"email": "dr.peds@hospital.com",    "name": "Dr. Sunita Nair",     "spec": "Paediatrics"},
    {"email": "dr.onco@hospital.com",    "name": "Dr. Vikram Patel",    "spec": "Oncology"},
    {"email": "dr.gastro@hospital.com",  "name": "Dr. Deepa Iyer",     "spec": "Gastroenterology"},
    {"email": "dr.pulmo@hospital.com",   "name": "Dr. Arun Thomas",    "spec": "Pulmonology"},
    {"email": "dr.eye@hospital.com",     "name": "Dr. Meera Krishnan",  "spec": "Ophthalmology"},
]

created = 0
skipped = 0

for doc in DOCTORS:
    # Check if user already exists
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": doc["email"]}
    ).fetchone()

    if existing:
        print(f"  SKIP (already exists): {doc['email']}")
        skipped += 1
        continue

    # Insert user
    result = db.execute(
        text("""
            INSERT INTO users (email, hashed_password, role, is_active)
            VALUES (:email, :pw, 'doctor', true)
            RETURNING id
        """),
        {"email": doc["email"], "pw": hashed}
    )
    user_id = result.fetchone()[0]

    # Insert doctor_profile
    db.execute(
        text("""
            INSERT INTO doctor_profiles
                (user_id, full_name, specialization, is_verified, phone_number)
            VALUES
                (:uid, :name, :spec, true, '+91 98765 43210')
        """),
        {"uid": user_id, "name": doc["name"], "spec": doc["spec"]}
    )

    # Insert availability (set as available)
    db.execute(
        text("""
            INSERT INTO doctor_availability (doctor_id, is_available, unavailable_days, unavailable_dates)
            VALUES (:uid, true, '[]', '[]')
            ON CONFLICT (doctor_id) DO UPDATE SET is_available = true
        """),
        {"uid": user_id}
    )

    print(f"  CREATED: {doc['name']} ({doc['spec']}) -> {doc['email']} / Doctor@123")
    created += 1

db.commit()
db.close()

print()
print(f"Done! Created {created} doctors, skipped {skipped} (already existed).")
print()
print("All doctor passwords: Doctor@123")
print()
print("Now visit your booking modal — departments should appear.")
