"""
migrate_sqlite_to_pg.py
-----------------------
One-shot script that copies all data from the local SQLite database
(patientintake.db) into a PostgreSQL database.

Usage:
    1. Make sure .env contains the correct DATABASE_URL for PostgreSQL.
    2. Make sure a PostgreSQL database with that name already exists
       (e.g. run: createdb patientintake  OR use pgAdmin).
    3. Run:
           python migrate_sqlite_to_pg.py

The script will:
    - Create all tables in Postgres (via SQLAlchemy models)
    - Copy every row from SQLite into Postgres in FK-safe order
    - Print a summary of rows migrated per table
"""

import os
import sys

# ── 1. Load environment ─────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
    print("ERROR: DATABASE_URL in .env must be a PostgreSQL URL "
          "(postgresql://user:pass@host/dbname).")
    sys.exit(1)

# ── 2. Build SQLite source engine ───────────────────────────────────────────
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'patientintake.db')}"

sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
SQLiteSession = sessionmaker(bind=sqlite_engine)

# ── 3. Build PostgreSQL destination engine ───────────────────────────────────
pg_engine = create_engine(DATABASE_URL)
PGSession = sessionmaker(bind=pg_engine)

# ── 4. Import models and create tables in Postgres ──────────────────────────
print("Creating tables in PostgreSQL...")
import models
import appointment_models
models.Base.metadata.create_all(bind=pg_engine)
appointment_models.Base.metadata.create_all(bind=pg_engine)
print("Tables created.\n")

# ── 5. Migrate data table by table (FK-safe order) ──────────────────────────
# We use raw SQL through the engines to avoid any ORM mapping issues.

def migrate_table(table_name: str):
    """Copy all rows from SQLite table into PostgreSQL table."""
    with sqlite_engine.connect() as src_conn:
        rows = src_conn.execute(text(f"SELECT * FROM {table_name}")).mappings().all()

    if not rows:
        print(f"  {table_name}: 0 rows (skipped)")
        return

    with pg_engine.begin() as dst_conn:
        # Truncate first to allow re-runs
        dst_conn.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE"))
        # Insert rows
        for row in rows:
            cols = ", ".join(row.keys())
            placeholders = ", ".join(f":{k}" for k in row.keys())
            stmt = text(f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})")
            dst_conn.execute(stmt, dict(row))

    print(f"  {table_name}: {len(rows)} row(s) migrated")


# Tables in safe migration order (parents before children)
MIGRATION_ORDER = [
    "users",
    "patient_profiles",
    "doctor_profiles",
    "documents",
    "policies",
    "audit_logs",
    "messages",
    "feedback",
    "notifications",
    "doctor_schedules",
    "doctor_availability",
    "appointments",
    "medical_records",
    "tokens",
    "video_sessions",
]

print("Migrating data...\n")
for table in MIGRATION_ORDER:
    try:
        migrate_table(table)
    except Exception as e:
        print(f"  WARNING: Could not migrate '{table}': {e}")

# ── 6. Reset PostgreSQL sequences so new inserts get correct IDs ─────────────
print("\nResetting PostgreSQL sequences...")
with pg_engine.begin() as conn:
    # Get all sequences
    seqs = conn.execute(text(
        """
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        """
    )).fetchall()

    for (seq_name,) in seqs:
        # Derive table name from sequence (convention: tablename_id_seq)
        parts = seq_name.replace("_id_seq", "")
        try:
            conn.execute(text(
                f"SELECT setval('{seq_name}', COALESCE((SELECT MAX(id) FROM {parts}), 1))"
            ))
            print(f"  Reset sequence: {seq_name}")
        except Exception as e:
            print(f"  Could not reset sequence {seq_name}: {e}")

print("\n✅  Migration complete!")
print(f"   Source:      {SQLITE_URL}")
print(f"   Destination: {DATABASE_URL}")
