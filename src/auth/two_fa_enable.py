#!/usr/bin/env python3
"""Enable 2FA for a user."""

import sys
import json
from src.auth.two_fa_manager import enable_two_fa


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python -m src.auth.two_fa_enable <user_id> <phone_number> [country_code]"
        }))
        sys.exit(1)

    user_id = sys.argv[1]
    phone_number = sys.argv[2]
    country_code = sys.argv[3] if len(sys.argv) > 3 else "+49"

    try:
        result = enable_two_fa(user_id, phone_number, country_code)
        print(json.dumps(result))
        sys.exit(0)

    except ValueError as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Failed to enable 2FA: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
