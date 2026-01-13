#!/usr/bin/env python3
"""Disable 2FA for a user."""

import sys
import json
from src.auth.two_fa_manager import disable_two_fa


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python -m src.auth.two_fa_disable <user_id>"
        }))
        sys.exit(1)

    user_id = sys.argv[1]

    try:
        success = disable_two_fa(user_id)
        print(json.dumps({
            "success": success
        }))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Failed to disable 2FA: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
