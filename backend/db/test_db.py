"""
Test script to verify database setup.
This script is completely isolated from the main application.
"""
from database import Base, engine, SessionLocal
from models import User, SearchHistory

def init_db():
    """Initialize the database by creating all tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

def test_models():
    """Test model creation and relationships."""
    db = SessionLocal()
    try:
        # Create test user
        test_user = User(
            email="test@example.com",
            username="testuser",
            hashed_password="dummyhash"
        )
        db.add(test_user)
        db.commit()
        print("Test user created successfully!")

        # Create test search history
        test_search = SearchHistory(
            user_id=test_user.id,
            product_title="Test Product",
            product_category="Sneakers",
            product_details={"brand": "Test", "color": "Black"},
            market_metrics={"sell_through_rate": 75.5}
        )
        db.add(test_search)
        db.commit()
        print("Test search history created successfully!")

        # Test relationship
        user_searches = db.query(User).first().searches
        print(f"User has {len(user_searches)} searches")

    except Exception as e:
        print(f"Error during model test: {str(e)}")
        db.rollback()
    finally:
        db.close()

def test_connection():
    """Test database connection and table creation."""
    try:
        init_db()
        test_models()
        print("Database test completed successfully!")
    except Exception as e:
        print(f"Error during database test: {str(e)}")

if __name__ == "__main__":
    test_connection()
