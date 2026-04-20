from database import engine
from sqlalchemy import text, inspect

def update_schema():
    inspector = inspect(engine)
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # Check tables
        tables = inspector.get_table_names()
        print(f"Existing tables: {tables}")

        # 1. Create doctor_schedules if not exists
        if 'doctor_schedules' not in tables:
            print("Creating doctor_schedules table...")
            # We'll use raw SQL for simplicity in this script, or better, use models.Base.metadata.create_all(bind=engine)
            # But let's try to add the table definition manually to be safe if models import is tricky
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS doctor_schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doctor_id INTEGER,
                    day_of_week INTEGER,
                    start_time TIME,
                    end_time TIME,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY(doctor_id) REFERENCES users(id)
                )
            """))
        else:
            print("doctor_schedules table already exists.")

        # 2. Add slot_id to tokens
        columns_tokens = [c['name'] for c in inspector.get_columns('tokens')]
        if 'slot_id' not in columns_tokens:
            print("Adding slot_id to tokens...")
            conn.execute(text("ALTER TABLE tokens ADD COLUMN slot_id INTEGER REFERENCES doctor_schedules(id)"))
        else:
            print("slot_id already exists in tokens.")

        # 3. Add unavailable_days to doctor_availability
        columns_availability = [c['name'] for c in inspector.get_columns('doctor_availability')]
        if 'unavailable_days' not in columns_availability:
            print("Adding unavailable_days to doctor_availability...")
            # For SQLite, we store JSON as TEXT usually, but let's see if the previous script worked partly.
            conn.execute(text("ALTER TABLE doctor_availability ADD COLUMN unavailable_days JSON DEFAULT '[]'"))
        else:
            print("unavailable_days already exists in doctor_availability.")

if __name__ == "__main__":
    try:
        update_schema()
        print("Schema update successful.")
    except Exception as e:
        print(f"Schema update failed: {e}")
