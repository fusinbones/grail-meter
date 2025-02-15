"""
Database models package initialization.
This file is intentionally empty and only serves to mark the directory as a Python package.
"""

from .user import User  # Import the User model
from .search_history import SearchHistory  # Import the SearchHistory model

# List of all models for easy access
__all__ = ["User", "SearchHistory"]
