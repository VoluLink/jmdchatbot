#!/usr/bin/env python3
"""Send verification code via SMS."""

import sys
import json
from src.auth.two_fa_manager import send_verification_code


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python -m src.auth.two_fa_send_code <user_id> <purpose>"
        }))
        sys.exit(1)

    user_id = sys.argv[1]
    purpose = sys.argv[2]  # 'login', 'setup', or 'verification'

    try:
        result = send_verification_code(user_id, purpose)
        print(json.dumps(result))

        if result["success"]:
            sys.exit(0)
        else:
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
