"""Two-factor authentication manager."""

import secrets
import string
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import bcrypt

from src.auth.database import get_connection
from src.auth.totp_service import setup_totp_for_user, verify_totp_code


# ============================================================================
# Code Generation & Hashing
# ============================================================================

def generate_otp_code() -> str:
    """
    Generate a 6-digit numeric OTP code.

    Returns:
        6-digit string (e.g., "123456")
    """
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def generate_backup_codes(count: int = 8) -> List[str]:
    """
    Generate backup codes for account recovery.

    Args:
        count: Number of backup codes to generate (default 8)

    Returns:
        List of backup codes in format "XXXX-XXXX-XXXX"
    """
    # Use alphanumeric without confusing characters (O, 0, I, 1)
    alphabet = string.ascii_uppercase + string.digits
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('1', '')

    codes = []
    for _ in range(count):
        # Generate 12-character code
        code_chars = ''.join(secrets.choice(alphabet) for _ in range(12))
        # Format as XXXX-XXXX-XXXX
        formatted = f"{code_chars[0:4]}-{code_chars[4:8]}-{code_chars[8:12]}"
        codes.append(formatted)

    return codes


def hash_code(code: str) -> str:
    """
    Hash a code using bcrypt.

    Args:
        code: Plain text code to hash

    Returns:
        Bcrypt hash string
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(code.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_code_hash(code: str, code_hash: str) -> bool:
    """
    Verify a code against its bcrypt hash.

    Args:
        code: Plain text code
        code_hash: Bcrypt hash to verify against

    Returns:
        True if code matches hash, False otherwise
    """
    try:
        return bcrypt.checkpw(code.encode("utf-8"), code_hash.encode("utf-8"))
    except Exception:
        return False


# ============================================================================
# Verification Code Management
# ============================================================================

def create_verification_code(
    user_id: str,
    purpose: str,
    expiry_minutes: int = 10
) -> Dict:
    """
    Create a verification code for 2FA.

    Args:
        user_id: User ID
        purpose: Purpose of code ('login', 'setup', 'verification')
        expiry_minutes: Minutes until code expires (default 10)

    Returns:
        dict with keys: id, code (plaintext), expires_at
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Generate code
    code = generate_otp_code()
    code_hashed = hash_code(code)

    # Calculate expiry
    now = datetime.now()
    expires_at = now + timedelta(minutes=expiry_minutes)

    # Generate ID
    code_id = f"code_{int(time.time())}_{secrets.token_hex(8)}"

    # Insert into database
    cursor.execute("""
        INSERT INTO two_fa_codes (
            id, user_id, code_hash, purpose,
            created_at, expires_at, attempts, max_attempts, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        code_id,
        user_id,
        code_hashed,
        purpose,
        now.isoformat(),
        expires_at.isoformat(),
        0,
        3,
        0
    ))

    conn.commit()

    return {
        "id": code_id,
        "code": code,  # Return plaintext code (for sending via SMS)
        "expires_at": expires_at.isoformat(),
    }


def verify_and_consume_code(user_id: str, code: str, purpose: str) -> bool:
    """
    Verify a code and mark it as used.

    Args:
        user_id: User ID
        code: Plaintext code to verify
        purpose: Purpose of code ('login', 'setup', 'verification')

    Returns:
        True if code is valid and verified, False otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Find the most recent valid code for this user and purpose
    cursor.execute("""
        SELECT id, code_hash, expires_at, attempts, max_attempts, verified
        FROM two_fa_codes
        WHERE user_id = ? AND purpose = ? AND verified = 0
        ORDER BY created_at DESC
        LIMIT 1
    """, (user_id, purpose))

    row = cursor.fetchone()
    if not row:
        return False

    code_id, code_hash, expires_at_str, attempts, max_attempts, verified = row

    # Check if code is expired
    expires_at = datetime.fromisoformat(expires_at_str)
    if datetime.now() > expires_at:
        return False

    # Check if max attempts exceeded
    if attempts >= max_attempts:
        return False

    # Verify code
    if not verify_code_hash(code, code_hash):
        # Increment failed attempts
        cursor.execute("""
            UPDATE two_fa_codes
            SET attempts = attempts + 1
            WHERE id = ?
        """, (code_id,))
        conn.commit()
        return False

    # Mark code as verified
    cursor.execute("""
        UPDATE two_fa_codes
        SET verified = 1
        WHERE id = ?
    """, (code_id,))
    conn.commit()

    return True


def cleanup_expired_codes() -> int:
    """
    Delete expired verification codes.

    Returns:
        Number of codes deleted
    """
    conn = get_connection()
    cursor = conn.cursor()

    now = datetime.now().isoformat()
    cursor.execute("""
        DELETE FROM two_fa_codes
        WHERE expires_at < ?
    """, (now,))

    deleted = cursor.rowcount
    conn.commit()

    return deleted


# ============================================================================
# Backup Codes Management
# ============================================================================

def store_backup_codes(user_id: str, codes: List[str]) -> None:
    """
    Store backup codes for a user (hashed).

    Args:
        user_id: User ID
        codes: List of plaintext backup codes
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Delete existing backup codes for this user
    cursor.execute("DELETE FROM backup_codes WHERE user_id = ?", (user_id,))

    # Insert new backup codes
    now = datetime.now().isoformat()
    for code in codes:
        code_id = f"backup_{int(time.time())}_{secrets.token_hex(8)}"
        code_hashed = hash_code(code)

        cursor.execute("""
            INSERT INTO backup_codes (id, user_id, code_hash, used, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (code_id, user_id, code_hashed, 0, now))

    conn.commit()


def verify_backup_code(user_id: str, code: str) -> bool:
    """
    Verify and consume a backup code.

    Args:
        user_id: User ID
        code: Plaintext backup code

    Returns:
        True if code is valid and marked as used, False otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get all unused backup codes for this user
    cursor.execute("""
        SELECT id, code_hash
        FROM backup_codes
        WHERE user_id = ? AND used = 0
    """, (user_id,))

    rows = cursor.fetchall()

    for row in rows:
        code_id, code_hash = row

        if verify_code_hash(code, code_hash):
            # Mark code as used
            cursor.execute("""
                UPDATE backup_codes
                SET used = 1, used_at = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), code_id))
            conn.commit()
            return True

    return False


def get_backup_codes_remaining(user_id: str) -> int:
    """
    Get the number of unused backup codes for a user.

    Args:
        user_id: User ID

    Returns:
        Number of unused backup codes
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*)
        FROM backup_codes
        WHERE user_id = ? AND used = 0
    """, (user_id,))

    count = cursor.fetchone()[0]
    return count


# ============================================================================
# Pending 2FA Session Management
# ============================================================================

def create_pending_session(user_id: str, expiry_minutes: int = 15) -> str:
    """
    Create a pending 2FA session after password verification.

    Args:
        user_id: User ID
        expiry_minutes: Minutes until session expires (default 15)

    Returns:
        Session token (to be used for 2FA verification)
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Generate session token
    session_token = secrets.token_urlsafe(32)

    # Calculate expiry
    now = datetime.now()
    expires_at = now + timedelta(minutes=expiry_minutes)

    # Generate session ID
    session_id = f"session_{int(time.time())}_{secrets.token_hex(8)}"

    # Insert into database
    cursor.execute("""
        INSERT INTO two_fa_sessions (id, user_id, session_token, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
    """, (session_id, user_id, session_token, now.isoformat(), expires_at.isoformat()))

    conn.commit()

    return session_token


def verify_pending_session(session_token: str) -> Optional[Dict]:
    """
    Verify a pending 2FA session token.

    Args:
        session_token: Session token to verify

    Returns:
        User info dict if valid, None otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Find session
    cursor.execute("""
        SELECT s.id, s.user_id, s.expires_at, u.email, u.name, u.role
        FROM two_fa_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ?
    """, (session_token,))

    row = cursor.fetchone()
    if not row:
        return None

    session_id, user_id, expires_at_str, email, name, role = row

    # Check if expired
    expires_at = datetime.fromisoformat(expires_at_str)
    if datetime.now() > expires_at:
        # Delete expired session
        cursor.execute("DELETE FROM two_fa_sessions WHERE id = ?", (session_id,))
        conn.commit()
        return None

    return {
        "id": user_id,
        "email": email,
        "name": name,
        "role": role,
    }


def consume_pending_session(session_token: str) -> bool:
    """
    Consume (delete) a pending 2FA session after successful verification.

    Args:
        session_token: Session token to consume

    Returns:
        True if session was found and deleted, False otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM two_fa_sessions
        WHERE session_token = ?
    """, (session_token,))

    deleted = cursor.rowcount > 0
    conn.commit()

    return deleted


def cleanup_expired_sessions() -> int:
    """
    Delete expired pending 2FA sessions.

    Returns:
        Number of sessions deleted
    """
    conn = get_connection()
    cursor = conn.cursor()

    now = datetime.now().isoformat()
    cursor.execute("""
        DELETE FROM two_fa_sessions
        WHERE expires_at < ?
    """, (now,))

    deleted = cursor.rowcount
    conn.commit()

    return deleted


# ============================================================================
# 2FA Settings Management
# ============================================================================

def setup_two_fa(user_id: str, user_email: str) -> Dict:
    """
    Setup TOTP 2FA for a user (Step 1: Generate QR code).

    This generates the TOTP secret and QR code but does NOT enable 2FA yet.
    User must scan the QR code and verify with a code first.

    Args:
        user_id: User ID
        user_email: User's email address (shown in authenticator app)

    Returns:
        dict with keys: qr_code_base64, manual_entry_key, secret
    """
    # Generate TOTP secret and QR code
    totp_data = setup_totp_for_user(user_email)

    # Store secret in database (but don't enable 2FA yet)
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE users
        SET totp_secret = ?
        WHERE id = ?
    """, (totp_data["secret"], user_id))

    conn.commit()

    return {
        "qr_code_base64": totp_data["qr_code_base64"],
        "manual_entry_key": totp_data["manual_entry_key"],
        "secret": totp_data["secret"],
    }


def enable_two_fa(user_id: str, verification_code: str) -> Dict:
    """
    Enable 2FA for a user (Step 2: Verify code and enable).

    User must provide a valid TOTP code from their authenticator app
    to prove they've successfully set it up.

    Args:
        user_id: User ID
        verification_code: 6-digit code from authenticator app

    Returns:
        dict with keys: success, backup_codes

    Raises:
        ValueError: If code is invalid or TOTP not set up
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get user's TOTP secret
    cursor.execute("SELECT totp_secret FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()

    if not row or not row[0]:
        raise ValueError("TOTP not set up. Call setup_two_fa first.")

    totp_secret = row[0]

    # Verify the code
    if not verify_totp_code(totp_secret, verification_code):
        raise ValueError("Invalid verification code")

    # Generate backup codes
    backup_codes = generate_backup_codes(8)
    store_backup_codes(user_id, backup_codes)

    # Enable 2FA
    now = datetime.now().isoformat()
    cursor.execute("""
        UPDATE users
        SET two_fa_enabled = 1,
            two_fa_enrolled_at = ?
        WHERE id = ?
    """, (now, user_id))

    conn.commit()

    return {
        "success": True,
        "backup_codes": backup_codes,
    }


def disable_two_fa(user_id: str) -> bool:
    """
    Disable 2FA for a user.

    Args:
        user_id: User ID

    Returns:
        True if successful
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Clear 2FA fields
    cursor.execute("""
        UPDATE users
        SET totp_secret = NULL,
            two_fa_enabled = 0,
            two_fa_enrolled_at = NULL
        WHERE id = ?
    """, (user_id,))

    # Delete all backup codes
    cursor.execute("DELETE FROM backup_codes WHERE user_id = ?", (user_id,))

    # Delete all pending codes and sessions
    cursor.execute("DELETE FROM two_fa_codes WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM two_fa_sessions WHERE user_id = ?", (user_id,))

    conn.commit()
    return True


def get_two_fa_status(user_id: str) -> Dict:
    """
    Get 2FA status for a user.

    Args:
        user_id: User ID

    Returns:
        dict with keys: enabled, enrolled_at, backup_codes_remaining
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT two_fa_enabled, two_fa_enrolled_at
        FROM users
        WHERE id = ?
    """, (user_id,))

    row = cursor.fetchone()
    if not row:
        return {
            "enabled": False,
            "enrolled_at": None,
            "backup_codes_remaining": 0,
        }

    two_fa_enabled, enrolled_at = row

    return {
        "enabled": bool(two_fa_enabled),
        "enrolled_at": enrolled_at,
        "backup_codes_remaining": get_backup_codes_remaining(user_id) if two_fa_enabled else 0,
    }


def verify_two_fa_login(user_id: str, code: str) -> bool:
    """
    Verify a TOTP code or backup code during login.

    Args:
        user_id: User ID
        code: 6-digit TOTP code or backup code (format: XXXX-XXXX-XXXX)

    Returns:
        True if code is valid, False otherwise
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get user's TOTP secret
    cursor.execute("SELECT totp_secret, two_fa_enabled FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()

    if not row or not row[1]:  # 2FA not enabled
        return False

    totp_secret = row[0]

    # Try TOTP code first (6 digits)
    if len(code) == 6 and code.isdigit():
        if verify_totp_code(totp_secret, code):
            return True

    # Try backup code (format: XXXX-XXXX-XXXX)
    if "-" in code:
        return verify_backup_code(user_id, code)

    return False


# ============================================================================
# Rate Limiting
# ============================================================================

def check_rate_limit(user_id: str, max_per_hour: int = 5) -> bool:
    """
    Check if user has exceeded SMS rate limit.

    Args:
        user_id: User ID
        max_per_hour: Maximum SMS sends per hour (default 5)

    Returns:
        True if user is within rate limit, False if exceeded
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Count codes created in the last hour
    one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()

    cursor.execute("""
        SELECT COUNT(*)
        FROM two_fa_codes
        WHERE user_id = ? AND created_at > ?
    """, (user_id, one_hour_ago))

    count = cursor.fetchone()[0]

    return count < max_per_hour


# ============================================================================
# Send Verification Code (combines code creation and SMS sending)
# ============================================================================

def send_verification_code(user_id: str, purpose: str) -> Dict:
    """
    Generate and send a verification code via SMS.

    Args:
        user_id: User ID
        purpose: Purpose of code ('login', 'setup', 'verification')

    Returns:
        dict with keys: success, expires_in (seconds), error (if failed)
    """
    # Check rate limit
    if not check_rate_limit(user_id):
        return {
            "success": False,
            "error": "Rate limit exceeded. Please try again later.",
        }

    # Get user's phone number
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT phone_number, two_fa_enabled
        FROM users
        WHERE id = ?
    """, (user_id,))

    row = cursor.fetchone()
    if not row:
        return {
            "success": False,
            "error": "User not found",
        }

    phone_number, two_fa_enabled = row

    if not phone_number:
        return {
            "success": False,
            "error": "Phone number not configured",
        }

    # Create verification code
    code_data = create_verification_code(user_id, purpose, expiry_minutes=10)

    # Send SMS
    send_sms = get_send_function()
    result = send_sms(phone_number, code_data["code"])

    if not result["success"]:
        return {
            "success": False,
            "error": result.get("error", "Failed to send SMS"),
        }

    # Calculate expires_in seconds
    expires_at = datetime.fromisoformat(code_data["expires_at"])
    expires_in = int((expires_at - datetime.now()).total_seconds())

    return {
        "success": True,
        "expires_in": expires_in,
    }
