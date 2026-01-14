"""
TOTP (Time-based One-Time Password) service for authenticator app 2FA.
Compatible with Google Authenticator, Microsoft Authenticator, Authy, etc.
"""

import base64
import io
import pyotp
import qrcode
from typing import Dict


def generate_totp_secret() -> str:
    """
    Generate a random TOTP secret key.

    Returns:
        Base32-encoded secret string (e.g., "JBSWY3DPEHPK3PXP")
    """
    return pyotp.random_base32()


def generate_totp_uri(secret: str, user_email: str, issuer: str = "RAG Assistant") -> str:
    """
    Generate a TOTP URI for QR code generation.

    Args:
        secret: Base32-encoded TOTP secret
        user_email: User's email address (shown in authenticator app)
        issuer: Application name (shown in authenticator app)

    Returns:
        TOTP URI string (e.g., "otpauth://totp/RAG%20Assistant:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=RAG%20Assistant")
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=user_email, issuer_name=issuer)


def generate_qr_code_base64(totp_uri: str) -> str:
    """
    Generate a QR code image as base64 string.

    Args:
        totp_uri: TOTP URI from generate_totp_uri()

    Returns:
        Base64-encoded PNG image string (for use in <img src="data:image/png;base64,...">)
    """
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(totp_uri)
    qr.make(fit=True)

    # Generate image
    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    return img_base64


def verify_totp_code(secret: str, code: str, valid_window: int = 1) -> bool:
    """
    Verify a TOTP code entered by the user.

    Args:
        secret: Base32-encoded TOTP secret
        code: 6-digit code entered by user
        valid_window: Number of time windows to check (default 1 = ±30 seconds)
                     Allows for slight clock drift between server and user device

    Returns:
        True if code is valid, False otherwise
    """
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=valid_window)
    except Exception:
        return False


def get_current_totp_code(secret: str) -> str:
    """
    Get the current TOTP code for a given secret.
    Useful for testing/debugging.

    Args:
        secret: Base32-encoded TOTP secret

    Returns:
        Current 6-digit TOTP code
    """
    totp = pyotp.TOTP(secret)
    return totp.now()


def setup_totp_for_user(user_email: str) -> Dict:
    """
    Complete TOTP setup flow for a user.
    Generates secret, URI, and QR code.

    Args:
        user_email: User's email address

    Returns:
        dict with keys:
            - secret: TOTP secret (store in database)
            - qr_code_base64: QR code image as base64
            - manual_entry_key: Secret formatted for manual entry (with spaces)
    """
    # Generate secret
    secret = generate_totp_secret()

    # Generate URI
    totp_uri = generate_totp_uri(secret, user_email)

    # Generate QR code
    qr_code_base64 = generate_qr_code_base64(totp_uri)

    # Format secret for manual entry (add spaces every 4 chars for readability)
    manual_entry_key = " ".join([secret[i:i+4] for i in range(0, len(secret), 4)])

    return {
        "secret": secret,
        "qr_code_base64": qr_code_base64,
        "manual_entry_key": manual_entry_key,
    }


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Test TOTP service
    print("\n=== TOTP Service Test ===\n")

    # Setup for a test user
    user_email = "test@example.com"
    setup_data = setup_totp_for_user(user_email)

    print(f"User: {user_email}")
    print(f"Secret: {setup_data['secret']}")
    print(f"Manual Entry: {setup_data['manual_entry_key']}")
    print(f"\nQR Code (base64): {setup_data['qr_code_base64'][:50]}...")

    # Get current code
    current_code = get_current_totp_code(setup_data['secret'])
    print(f"\nCurrent TOTP Code: {current_code}")

    # Verify the code
    is_valid = verify_totp_code(setup_data['secret'], current_code)
    print(f"Code Verification: {'✓ Valid' if is_valid else '✗ Invalid'}")

    # Test invalid code
    is_invalid = verify_totp_code(setup_data['secret'], "000000")
    print(f"Invalid Code Test: {'✗ Rejected' if not is_invalid else '✓ Accepted (ERROR!)'}")

    print("\n=========================\n")
