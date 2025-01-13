"""
Test script to verify database setup and schema.
This script is completely isolated from the main application.
"""
from database import Base, engine
from models import User, SearchHistory

def init_db():
    """Initialize the database by creating all tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

def verify_schema():
    """Verify that all required tables and columns exist."""
    inspector = engine.dialect.inspector(engine)
    
    # Check User table schema
    user_columns = {col['name'] for col in inspector.get_columns('users')}
    required_user_columns = {'id', 'email', 'username', 'hashed_password', 'created_at', 'updated_at'}
    if not required_user_columns.issubset(user_columns):
        missing = required_user_columns - user_columns
        print(f"Error: Missing columns in users table: {missing}")
        return False
    print(" User table schema verified")

    # Check SearchHistory table schema
    search_columns = {col['name'] for col in inspector.get_columns('search_history')}
    required_search_columns = {'id', 'user_id', 'product_title', 'product_category', 
                             'product_details', 'market_metrics', 'created_at'}
    if not required_search_columns.issubset(search_columns):
        missing = required_search_columns - search_columns
        print(f"Error: Missing columns in search_history table: {missing}")
        return False
    print(" SearchHistory table schema verified")

    # Verify foreign key relationship
    fks = inspector.get_foreign_keys('search_history')
    if not any(fk['referred_table'] == 'users' for fk in fks):
        print("Error: Missing foreign key relationship to users table")
        return False
    print(" Foreign key relationships verified")

    return True

def test_connection():
    """Test database connection and schema setup."""
    try:
        init_db()
        if verify_schema():
            print("Database schema verification completed successfully!")
        else:
            print("Database schema verification failed!")
    except Exception as e:
        print(f"Error during database test: {str(e)}")

if __name__ == "__main__":
    test_connection()
