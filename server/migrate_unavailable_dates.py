
import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'patientintake.db')

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if unavailable_dates exists
    cursor.execute("PRAGMA table_info(doctor_availability)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'unavailable_dates' not in columns:
        print("Adding unavailable_dates column to doctor_availability...")
        try:
            cursor.execute("ALTER TABLE doctor_availability ADD COLUMN unavailable_dates JSON DEFAULT '[]'")
            conn.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Error adding column: {e}")
    else:
        print("unavailable_dates column already exists.")
        
    conn.close()

if __name__ == "__main__":
    migrate()
