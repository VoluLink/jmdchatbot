#!/usr/bin/env python3
"""Delete a user."""

import json
import sys

# Initialize database before importing user_manager
from src.auth import database
from src.auth.user_manager import delete_user


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: delete_user.py <user_id>"}), file=sys.stderr)
        sys.exit(1)
    
    user_id = sys.argv[1]
    
    try:
        deleted = delete_user(user_id)
        if deleted:
            print(json.dumps({"success": True}))
        else:
            print(json.dumps({"error": "User not found"}), file=sys.stderr)
            sys.exit(1)
    except ValueError as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Delete failed: {e}"}), file=sys.stderr)
        sys.exit(1)

