import sqlite3

DB_PATH = "patientintake.db"

def check_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print("Searching for 'saneetta' in users...")
        cursor.execute("SELECT id, email, role FROM users WHERE email LIKE '%saneetta%'")
        users = cursor.fetchall()
        
        for user in users:
            uid, email, role = user
            print(f"User Found: ID={uid}, Email={email}, Role={role}")
            
            # Check Profile
            cursor.execute("SELECT full_name, specialization FROM doctor_profiles WHERE user_id=?", (uid,))
            profile = cursor.fetchone()
            if profile:
                print(f"  Profile: Name={profile[0]}, Spec={profile[1]}")
            else:
                print("  No Doctor Profile found!")

            # Check Availability
            cursor.execute("SELECT is_available FROM doctor_availability WHERE doctor_id=?", (uid,))
            avail = cursor.fetchone()
            if avail:
                print(f"  Availability: {avail[0]}")
            else:
                print("  No Availability Record found (defaulting to False/Offline)")
                
                # Create one?
                print("  Creating default availability record (Offline)...")
                # We won't modify yet, just check.
        
        if not users:
            print("No user found with email containing 'saneetta'. listing all doctors...")
            cursor.execute("SELECT id, email FROM users WHERE role='doctor'")
            all_docs = cursor.fetchall()
            for d in all_docs:
                print(f"  Doc: ID={d[0]}, Email={d[1]}")

        conn.close()

    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    check_db()
