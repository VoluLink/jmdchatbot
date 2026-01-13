#!/usr/bin/env python3
"""Verify a 2FA code."""

import sys
import json
from src.auth.two_fa_manager import verify_and_consume_code, verify_backup_code


def main():
    if len(sys.argv) < 4:
        print(json.dumps({
            "success": False,
            "error": "Usage: python -m src.auth.two_fa_verify_code <user_id> <code> <purpose>"
        }))
        sys.exit(1)

    user_id = sys.argv[1]
    code = sys.argv[2]
    purpose = sys.argv[3]  # 'login', 'setup', 'verification', or 'backup'

    try:
        if purpose == 'backup':
            # Verify backup code
            success = verify_backup_code(user_id, code)
        else:
            # Verify OTP code
            success = verify_and_consume_code(user_id, code, purpose)

        print(json.dumps({
            "success": success
        }))

        sys.exit(0 if success else 1)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
