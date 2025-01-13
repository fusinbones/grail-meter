# Database Setup (Isolated)

This directory contains an isolated database setup that is completely separate from the main application.

## Structure
```
db/
├── models/              # Database models
│   ├── __init__.py     # Model exports
│   └── user.py         # User model
├── database.py         # Database connection
├── config.py          # Database configuration
└── test_db.py        # Test script
```

## Setup Instructions
1. Install dependencies:
```bash
pip install -r requirements_db.txt
```

2. Run test script:
```bash
cd backend/db
python test_db.py
```

## Safety Notes
- This setup is completely isolated from the main application
- No existing code is modified
- You can safely delete this directory without affecting the main tool
- All database files will be stored in this directory
