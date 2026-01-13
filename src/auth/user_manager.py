"""User management with SQLite backend."""

from datetime import datetime
from typing import Dict, List, Optional
import bcrypt

from src.auth.database import get_connection, dict_from_row


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def find_user_by_email(email: str) -> Optional[Dict]:
    """Find a user by email."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, email, name, password_hash as passwordHash, role,
               created_at as createdAt, last_login as lastLogin,
               two_fa_enabled as twoFaEnabled, phone_number as phoneNumber,
               phone_country_code as phoneCountryCode, two_fa_enrolled_at as twoFaEnrolledAt
        FROM users
        WHERE LOWER(email) = LOWER(?) AND is_active = 1
    """, (email,))

    row = cursor.fetchone()
    return dict_from_row(row) if row else None


def find_user_by_id(user_id: str) -> Optional[Dict]:
    """Find a user by ID."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, email, name, role, created_at as createdAt, last_login as lastLogin,
               two_fa_enabled as twoFaEnabled, phone_number as phoneNumber,
               phone_country_code as phoneCountryCode, two_fa_enrolled_at as twoFaEnrolledAt
        FROM users
        WHERE id = ? AND is_active = 1
    """, (user_id,))

    row = cursor.fetchone()
    return dict_from_row(row) if row else None


def create_user(email: str, password: str, name: str, role: str = "user") -> Dict:
    """Create a new user."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
    if cursor.fetchone():
        raise ValueError("User with this email already exists")
    
    # Validate role
    if role not in ["admin", "user"]:
        role = "user"
    
    # Create new user
    user_id = f"user_{datetime.now().timestamp()}".replace(".", "_")
    password_hash = hash_password(password)
    created_at = datetime.now().isoformat()
    
    cursor.execute("""
        INSERT INTO users (id, email, name, password_hash, role, created_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    """, (user_id, email, name, password_hash, role, created_at))
    
    conn.commit()
    
    return {
        "id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "createdAt": created_at,
        "lastLogin": None,
    }


def update_last_login(user_id: str) -> None:
    """Update user's last login timestamp."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE users 
        SET last_login = ? 
        WHERE id = ?
    """, (datetime.now().isoformat(), user_id))
    
    conn.commit()


def delete_user(user_id: str) -> bool:
    """Delete a user (soft delete)."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if user exists and get role
    cursor.execute("SELECT role FROM users WHERE id = ? AND is_active = 1", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        return False
    
    # Prevent deleting last admin
    if user["role"] == "admin":
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1")
        admin_count = cursor.fetchone()[0]
        if admin_count <= 1:
            raise ValueError("Cannot delete the last admin user")
    
    # Soft delete (set is_active = 0)
    cursor.execute("UPDATE users SET is_active = 0 WHERE id = ?", (user_id,))
    conn.commit()
    
    return True


def list_users() -> List[Dict]:
    """List all active users (without password hashes)."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, email, name, role, created_at as createdAt, last_login as lastLogin,
               two_fa_enabled as twoFaEnabled, phone_number as phoneNumber,
               phone_country_code as phoneCountryCode, two_fa_enrolled_at as twoFaEnrolledAt
        FROM users
        WHERE is_active = 1
        ORDER BY created_at DESC
    """)

    rows = cursor.fetchall()
    return [dict_from_row(row) for row in rows]


def update_user_role(user_id: str, new_role: str) -> bool:
    """Update a user's role."""
    conn = get_connection()
    cursor = conn.cursor()
    
    if new_role not in ["admin", "user"]:
        raise ValueError("Invalid role")
    
    # Check if user exists and get current role
    cursor.execute("SELECT role FROM users WHERE id = ? AND is_active = 1", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        return False
    
    # Prevent demoting last admin
    if user["role"] == "admin" and new_role != "admin":
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1")
        admin_count = cursor.fetchone()[0]
        if admin_count <= 1:
            raise ValueError("Cannot demote the last admin user")
    
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
    conn.commit()
    
    return True
