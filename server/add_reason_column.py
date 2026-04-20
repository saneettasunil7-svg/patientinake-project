from database import engine
from sqlalchemy import text

def add_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tokens ADD COLUMN reason_for_visit VARCHAR"))
            print("Added 'reason_for_visit' column to tokens table.")
        except Exception as e:
            print(f"Error (column might already exist): {e}")

if __name__ == "__main__":
    add_column()
