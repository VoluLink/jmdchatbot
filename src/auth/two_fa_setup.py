#!/usr/bin/env python3
"""CLI script to setup TOTP 2FA (generate QR code)."""

import sys
import json
from src.auth.two_fa_manager import setup_two_fa


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments"}))
        sys.exit(1)

    user_id = sys.argv[1]
    user_email = sys.argv[2]

    try:
        result = setup_two_fa(user_id, user_email)
        print(
            json.dumps(
                {
                    "success": True,
                    "qr_code_base64": result["qr_code_base64"],
                    "manual_entry_key": result["manual_entry_key"],
                }
            )
        )
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
