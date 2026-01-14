#!/usr/bin/env python3
"""CLI script to verify TOTP code during login."""

import sys
import json
from src.auth.two_fa_manager import verify_two_fa_login


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments"}))
        sys.exit(1)

    user_id = sys.argv[1]
    code = sys.argv[2]

    try:
        is_valid = verify_two_fa_login(user_id, code)
        print(json.dumps({"success": is_valid}))
        sys.exit(0 if is_valid else 1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
