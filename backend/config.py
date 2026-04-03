"""
Application configuration and settings
"""
import os

# MongoDB removed - using local browser storage
# MONGO_URI = ...
# DB_NAME = ...

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "spinoaid-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "*",
]
