from database import engine, Base
from sqlalchemy import text
import models

def update_schema():
    print("Updating database schema...")
    
    # 1. Create new tables (Policy, AuditLog)
    Base.metadata.create_all(bind=engine)
    print("Created new tables (if they didn't exist).")

    # 2. Add is_verified column to doctor_profiles
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("PRAGMA table_info(doctor_profiles)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'is_verified' not in columns:
                print("Adding 'is_verified' column to doctor_profiles...")
                conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
                print("Column added successfully.")
            else:
                print("'is_verified' column already exists.")
                
        except Exception as e:
            print(f"Error updating schema: {e}")

if __name__ == "__main__":
    update_schema()
