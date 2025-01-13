"""
Search History model for storing user searches.
This model is completely isolated and not connected to the main application.
"""
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class SearchHistory(Base):
    """Model for storing user search history and results."""
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_title = Column(String, nullable=False)
    product_category = Column(String)
    product_details = Column(JSON)  # Stores full product analysis
    market_metrics = Column(JSON)   # Stores sell-through rate and other metrics
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to User model
    user = relationship("User", back_populates="searches")
