from database import engine
import sqlalchemy
from sqlalchemy import text

print("Fixing missing columns in users and patient_profiles...")

with engine.connect() as conn:
    conn = conn.execution_options(isolation_level="AUTOCOMMIT")
    
    # Add profile_photo to users
    try:
        print("Adding profile_photo to users...")
        conn.execute(text("ALTER TABLE users ADD COLUMN profile_photo TEXT"))
    except sqlalchemy.exc.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("Column profile_photo already exists in users.")
        else:
            print(f"Error adding profile_photo to users: {e}")

    # Add profile_photo to patient_profiles (I saw it missing in previous logs too)
    try:
        print("Adding profile_photo to patient_profiles...")
        conn.execute(text("ALTER TABLE patient_profiles ADD COLUMN profile_photo TEXT"))
    except sqlalchemy.exc.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("Column profile_photo already exists in patient_profiles.")
        else:
            print(f"Error adding profile_photo to patient_profiles: {e}")

    # Add profile_photo to doctor_profiles
    try:
        print("Adding profile_photo to doctor_profiles...")
        conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN profile_photo TEXT"))
    except sqlalchemy.exc.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("Column profile_photo already exists in doctor_profiles.")
        else:
            print(f"Error adding profile_photo to doctor_profiles: {e}")

    # Add is_verified to doctor_profiles
    try:
        print("Adding is_verified to doctor_profiles...")
        conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
    except sqlalchemy.exc.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("Column is_verified already exists in doctor_profiles.")
        else:
            print(f"Error adding is_verified to doctor_profiles: {e}")

print("Database fix complete.")
