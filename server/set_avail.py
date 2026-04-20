import sqlite3

DB_PATH = "patientintake.db"
DOC_ID = 7

def set_avail():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print(f"Setting availability for Doctor ID {DOC_ID} to True...")
        cursor.execute("UPDATE doctor_availability SET is_available=1 WHERE doctor_id=?", (DOC_ID,))
        conn.commit()
        
        if cursor.rowcount > 0:
            print("Successfully updated availability.")
        else:
            print("No record updated (maybe no row existed?)")
            # Create if missing
            cursor.execute("INSERT OR IGNORE INTO doctor_availability (doctor_id, is_available) VALUES (?, 1)", (DOC_ID,))
            conn.commit()
            print("Inserted availability record.")

        conn.close()

    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    set_avail()
