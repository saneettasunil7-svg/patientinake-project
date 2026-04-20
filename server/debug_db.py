import sqlite3
import os

db_path = 'patientintake.db'
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Table: users ---")
cursor.execute("PRAGMA table_info(users)")
for col in cursor.fetchall():
    print(col)

print("\n--- User: shibis@gmail.com ---")
cursor.execute("SELECT * FROM users WHERE email='shibis@gmail.com'")
user = cursor.fetchone()
print(user)

conn.close()
