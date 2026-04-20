import sys
import os
from sqlalchemy import create_engine, text

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))
from database import engine

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE ambulance_agencies ADD COLUMN phone_number VARCHAR;"))
        conn.commit()
    print("Column added successfully via SQLAlchemy connect.")
except Exception as e:
    print(f"Error migrating DB: {e}")
