from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load .env file for local development
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Use DATABASE_URL from environment (set on Render dashboard),
# fall back to local SQLite for development
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"sqlite:///{os.path.join(BASE_DIR, 'patientintake.db')}"
)

# Supabase/Heroku provide "postgres://" but SQLAlchemy needs "postgresql://"
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Supabase requires SSL — append sslmode=require if not already present
if "postgresql" in SQLALCHEMY_DATABASE_URL and "sslmode" not in SQLALCHEMY_DATABASE_URL:
    separator = "&" if "?" in SQLALCHEMY_DATABASE_URL else "?"
    SQLALCHEMY_DATABASE_URL += f"{separator}sslmode=require"

is_postgres = "postgresql" in SQLALCHEMY_DATABASE_URL
print(f"DEBUG: Using database: {'PostgreSQL (Supabase)' if is_postgres else 'SQLite (local)'}")

# SQLite needs check_same_thread=False; PostgreSQL does not
connect_args = {"check_same_thread": False} if not is_postgres else {}

# pool_pre_ping=True verifies connections before use — critical for Render/Supabase
# which may drop idle connections on free tier
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,  # Recycle connections every 5 minutes
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

