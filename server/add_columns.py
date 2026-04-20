import sqlite3

DB_PATH = "patientintake.db"

def add_columns():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print("Checking existing columns...")
        cursor.execute("PRAGMA table_info(patient_profiles)")
        cols = [info[1] for info in cursor.fetchall()]
        print(f"Current columns: {cols}")
        
        if "gender" not in cols:
            print("Adding 'gender' column...")
            cursor.execute("ALTER TABLE patient_profiles ADD COLUMN gender TEXT")
        else:
            print("'gender' column already exists.")

        if "blood_group" not in cols:
            print("Adding 'blood_group' column...")
            cursor.execute("ALTER TABLE patient_profiles ADD COLUMN blood_group TEXT")
        else:
            print("'blood_group' column already exists.")

        conn.commit()
        conn.close()
        print("Database schema update complete.")

    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    add_columns()
