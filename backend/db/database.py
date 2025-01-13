"""
Database connection setup.
This module is completely isolated and not connected to the main application.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .config import SQLALCHEMY_DATABASE_URL, SQLALCHEMY_CONFIG

# Create SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    **SQLALCHEMY_CONFIG
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for database models
Base = declarative_base()

def get_db():
    """
    Get database session.
    This function will only be used when we're ready to connect the database.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
