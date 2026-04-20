import sqlite3
import sys

DB_PATH = "patientintake.db"
EMAIL = "saneettasunil@gmail.com"

def check_avail():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE email=?", (EMAIL,))
        user = cursor.fetchone()
        
        if user:
            uid = user[0]
            cursor.execute("SELECT is_available FROM doctor_availability WHERE doctor_id=?", (uid,))
            avail = cursor.fetchone()
            
            if avail:
                status = "ONLINE" if avail[0] else "OFFLINE"
                print(f"STATUS: {status} (Value: {avail[0]})")
            else:
                print("STATUS: NO RECORD")
        else:
            print("USER NOT FOUND")

        conn.close()

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_avail()
