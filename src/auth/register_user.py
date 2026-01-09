#!/usr/bin/env python3
"""Register a new user."""

import json
import sys

# Initialize database before importing user_manager
from src.auth import database
from src.auth.user_manager import create_user


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: register_user.py <email> <password> <name> [role]"}))
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3]
    role = sys.argv[4] if len(sys.argv) > 4 else "user"
    
    try:
        user = create_user(email, password, name, role)
        # Don't return password hash
        result = {
            "success": True,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
            }
        }
        print(json.dumps(result))
    except ValueError as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Registration failed: {e}"}), file=sys.stderr)
        sys.exit(1)

