import sqlite3

DB_PATH = "patientintake.db"

def verify_profile():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get latest user
        cursor.execute("SELECT id, email FROM users ORDER BY id DESC LIMIT 1")
        user = cursor.fetchone()
        
        if user:
            uid, email = user
            print(f"Checking profile for User ID {uid} ({email})...")
            
            cursor.execute("SELECT full_name, date_of_birth, gender, blood_group FROM patient_profiles WHERE user_id=?", (uid,))
            profile = cursor.fetchone()
            
            if profile:
                print(f"Profile Found:")
                print(f"  Name: {profile[0]}")
                print(f"  DOB: {profile[1]}")
                print(f"  Gender: {profile[2]}")
                print(f"  Blood Group: {profile[3]}")
                
                if profile[1] == "1990-01-01" and profile[2] == "Male" and profile[3] == "O+":
                    print("SUCCESS: All fields match test data!")
                else:
                    print("FAILURE: Fields do not match test data.")
            else:
                print("No Patient Profile found!")
        else:
            print("No users found in database.")

        conn.close()

    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    verify_profile()
