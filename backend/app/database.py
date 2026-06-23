from sqlalchemy import create_engine, Column, String, DateTime, JSON, Enum, Boolean, Integer, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum
import uuid as _uuid
from app.config import settings

_connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}
_pool_args = {} if "sqlite" in settings.database_url else {"pool_size": 10, "max_overflow": 20, "pool_pre_ping": True}
engine = create_engine(settings.database_url, connect_args=_connect_args, **_pool_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class JobStatus(str, enum.Enum):
    pending = "pending"
    downloading = "downloading"
    analyzing = "analyzing"
    extracting = "extracting"
    done = "done"
    failed = "failed"


class User(Base):
    """Registered user — linked to Google account or email-only."""
    __tablename__ = "users"
    id            = Column(String(36),  primary_key=True, default=lambda: str(_uuid.uuid4()))
    email         = Column(String(255), unique=True, index=True, nullable=False)
    google_id     = Column(String(100), unique=True, nullable=True, index=True)
    name          = Column(String(255), nullable=True)
    first_name    = Column(String(100), nullable=True)
    last_name     = Column(String(100), nullable=True)
    avatar_url    = Column(String(500), nullable=True)
    password_hash = Column(String(255), nullable=True)
    plan          = Column(String(20),  default="free")   # free | pro
    license_key   = Column(String(100), nullable=True)    # linked pro key
    is_admin      = Column(Boolean,     default=False)
    daily_jobs_used = Column(Integer,   default=0)
    daily_jobs_date = Column(String(10), nullable=True)   # YYYY-MM-DD, resets daily
    email_verified  = Column(Boolean,   default=False)
    password_reset_token   = Column(String(100), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    created_at    = Column(DateTime,    default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True)
    status = Column(Enum(JobStatus), default=JobStatus.pending)
    source_url = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    products = Column(JSON, default=list)
    error = Column(String, nullable=True)
    license_key = Column(String, nullable=True)
    user_id = Column(String(36), nullable=True)           # FK to users.id
    plan = Column(String, default="free")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class License(Base):
    __tablename__ = "licenses"
    key = Column(String, primary_key=True)
    email = Column(String, nullable=True)
    is_valid = Column(Boolean, default=True)
    plan = Column(String, default="pro")
    instance_id = Column(String, nullable=True)
    order_id = Column(String, nullable=True)
    jobs_used = Column(Integer, default=0)
    device_id = Column(String, nullable=True)
    activated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)


def run_migrations():
    """Add new columns to existing tables without dropping data."""
    with engine.connect() as conn:
        if "postgresql" in str(engine.url):
            stmts = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(100)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP",
            ]
            for stmt in stmts:
                try:
                    conn.execute(text(stmt))
                except Exception:
                    pass
            conn.commit()
