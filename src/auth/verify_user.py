#!/usr/bin/env python3
"""Verify user credentials."""

import json
import sys

# Initialize database before importing user_manager
from src.auth import database
from src.auth.user_manager import find_user_by_email, verify_password, update_last_login


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: verify_user.py <email> <password>"}))
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    try:
        user = find_user_by_email(email)
        
        if not user:
            sys.exit(1)  # User not found
        
        if not verify_password(password, user["passwordHash"]):
            sys.exit(1)  # Invalid password
        
        # Update last login
        update_last_login(user["id"])
        
        # Return user data (without password hash)
        result = {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        }
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

