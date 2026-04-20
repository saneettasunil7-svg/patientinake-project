import sqlite3
import os

db_path = os.path.join(os.getcwd(), "patientintake.db")
print(f"Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current columns
    cursor.execute("PRAGMA table_info(tokens)")
    columns = [column[1] for column in cursor.fetchall()]
    print(f"Current columns in 'tokens': {columns}")
    
    added_count = 0
    if "payment_status" not in columns:
        print("Adding 'payment_status' column...")
        cursor.execute("ALTER TABLE tokens ADD COLUMN payment_status VARCHAR DEFAULT 'pending'")
        added_count += 1
    
    if "payment_amount" not in columns:
        print("Adding 'payment_amount' column...")
        cursor.execute("ALTER TABLE tokens ADD COLUMN payment_amount INTEGER DEFAULT 500")
        added_count += 1
        
    if added_count > 0:
        conn.commit()
        print(f"Successfully added {added_count} columns.")
    else:
        print("Table 'tokens' already up to date.")
        
    conn.close()
except Exception as e:
    print(f"Error during migration: {e}")
