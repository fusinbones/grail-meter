"""
Database configuration settings.
This file is completely isolated from the main application.
"""
from pathlib import Path

# Database will be stored in the db directory
DB_DIR = Path(__file__).parent
SQLITE_DB_PATH = DB_DIR / "grail_meter.db"

# SQLite connection string
SQLALCHEMY_DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"

# SQLAlchemy configuration
SQLALCHEMY_CONFIG = {
    "pool_pre_ping": True,  # Verify connection before using
    "echo": False,          # Don't log all SQL queries
}
