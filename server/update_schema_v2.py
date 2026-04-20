from database import engine, Base
import models
import appointment_models

print("Creating new tables and updating schema...")
# This will create tables if they don't exist. 
# For existing tables, it won't add columns automatically in SQLAlchemy without a migration tool like Alembic.
# Since we are in dev and can't easily use Alembic here, we might need to manually alter or drop/create.
# detailed prompt said "Existing data might need migration or reset".
# We will try to create them. If `doctor_schedules` doesn't exist, it will be created.
# For `tokens` and `doctor_availability`, we might need to alter.

import sqlalchemy
from sqlalchemy import text

with engine.connect() as conn:
    conn = conn.execution_options(isolation_level="AUTOCOMMIT")
    
    # 1. Create doctor_schedules table
    print("Creating doctor_schedules table...")
    appointment_models.DoctorSchedule.__table__.create(conn, checkfirst=True)
    
    # 2. Add slot_id to tokens
    print("Adding slot_id to tokens...")
    try:
        conn.execute(text("ALTER TABLE tokens ADD COLUMN slot_id INTEGER REFERENCES doctor_schedules(id)"))
    except sqlalchemy.exc.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column slot_id already exists in tokens.")
        else:
            print(f"Error adding slot_id: {e}")

    # 3. Add unavailable_days to doctor_availability
    print("Adding unavailable_days to doctor_availability...")
    try:
        # JSON type syntax might vary by DB. using JSON for Postgres/SQLite
        conn.execute(text("ALTER TABLE doctor_availability ADD COLUMN unavailable_days JSON DEFAULT '[]'"))
    except sqlalchemy.exc.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column unavailable_days already exists.")
        else:
            print(f"Error adding unavailable_days: {e}")

print("Schema update complete.")
