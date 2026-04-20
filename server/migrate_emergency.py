import sqlite3
import os

# Base directory for the database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'patientintake.db')

def migrate():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(tokens)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_emergency' not in columns:
            print("Adding 'is_emergency' column to 'tokens' table...")
            cursor.execute("ALTER TABLE tokens ADD COLUMN is_emergency BOOLEAN DEFAULT 0")
            conn.commit()
            print("Successfully added 'is_emergency' column.")
        else:
            print("'is_emergency' column already exists.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
