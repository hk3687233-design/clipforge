from sqlalchemy import create_engine, Column, String, DateTime, JSON, Enum, Boolean, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum
from app.config import settings

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class JobStatus(str, enum.Enum):
    pending = "pending"
    downloading = "downloading"
    analyzing = "analyzing"
    extracting = "extracting"
    done = "done"
    failed = "failed"


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True)
    status = Column(Enum(JobStatus), default=JobStatus.pending)
    source_url = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    products = Column(JSON, default=list)
    error = Column(String, nullable=True)
    license_key = Column(String, nullable=True)   # which license ran this job
    plan = Column(String, default="free")          # free | pro
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class License(Base):
    __tablename__ = "licenses"
    key = Column(String, primary_key=True)
    email = Column(String, nullable=True)
    is_valid = Column(Boolean, default=True)
    plan = Column(String, default="pro")           # free | pro
    instance_id = Column(String, nullable=True)    # Lemon Squeezy instance
    order_id = Column(String, nullable=True)
    jobs_used = Column(Integer, default=0)
    device_id = Column(String, nullable=True)      # fingerprint of first device that activated
    activated_at = Column(DateTime, nullable=True) # when key was first activated
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
