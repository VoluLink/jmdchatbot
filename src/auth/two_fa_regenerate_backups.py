#!/usr/bin/env python3
"""Regenerate backup codes for a user."""

import sys
import json
from src.auth.two_fa_manager import generate_backup_codes, store_backup_codes, get_two_fa_status


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python -m src.auth.two_fa_regenerate_backups <user_id>"
        }))
        sys.exit(1)

    user_id = sys.argv[1]

    try:
        # Check if 2FA is enabled
        status = get_two_fa_status(user_id)
        if not status["enabled"]:
            print(json.dumps({
                "success": False,
                "error": "2FA is not enabled for this user"
            }))
            sys.exit(1)

        # Generate new backup codes
        backup_codes = generate_backup_codes(8)

        # Store them (this deletes old codes)
        store_backup_codes(user_id, backup_codes)

        print(json.dumps({
            "success": True,
            "backup_codes": backup_codes
        }))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Failed to regenerate backup codes: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
