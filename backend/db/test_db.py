"""
Test script to verify database setup.
This script is completely isolated from the main application.
"""
from database import Base, engine
from models import User

def init_db():
    """Initialize the database by creating all tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

def test_connection():
    """Test database connection and table creation."""
    try:
        init_db()
        print("Database test completed successfully!")
    except Exception as e:
        print(f"Error during database test: {str(e)}")

if __name__ == "__main__":
    test_connection()
