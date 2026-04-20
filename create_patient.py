import sqlite3
import sys
sys.path.append('server')
from auth import get_password_hash
conn = sqlite3.connect('server/patientintake.db')
c = conn.cursor()
hashed = get_password_hash('password123')
c.execute("INSERT INTO users (email, hashed_password, role, is_active) VALUES ('patient@example.com', ?, 'patient', 1)", (hashed,))
conn.commit()
print('Patient created')
