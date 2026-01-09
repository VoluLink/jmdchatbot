#!/usr/bin/env python3
"""List all users."""

import json
import sys

# Initialize database before importing user_manager
from src.auth import database
from src.auth.user_manager import list_users


if __name__ == "__main__":
    try:
        users = list_users()
        print(json.dumps(users))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

