#!/usr/bin/env python3
"""Switch from SMS-based 2FA to TOTP (authenticator app) 2FA."""

import sqlite3
import shutil
from pathlib import Path
from datetime import datetime


DB_PATH = Path("data/auth.db")
BACKUP_DIR = Path("data/backups")


def create_backup():
    """Create backup of database before migration."""
    if not DB_PATH.exists():
        print("[WARNING] Database does not exist. Creating new database.")
        return

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"auth_backup_{timestamp}.db"

    shutil.copy2(DB_PATH, backup_path)
    print(f"[OK] Backup created: {backup_path}")

    # Keep only last 5 backups
    backups = sorted(BACKUP_DIR.glob("auth_backup_*.db"), reverse=True)
    for old_backup in backups[5:]:
        old_backup.unlink()
        print(f"  Removed old backup: {old_backup.name}")


def column_exists(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    """Check if a column exists in a table."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def migrate():
    """Run the migration."""
    print("Starting TOTP migration...")
    print("=" * 60)

    # Create backup first
    create_backup()
    print()

    # Connect to database
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    try:
        # Add totp_secret column to users table
        print("1. Adding TOTP support to users table...")

        if not column_exists(cursor, "users", "totp_secret"):
            cursor.execute("ALTER TABLE users ADD COLUMN totp_secret TEXT")
            print("  [OK] Added column: totp_secret")
        else:
            print("  > Column already exists: totp_secret")

        # Note: We're keeping phone_number and phone_country_code for backwards compatibility
        # They will just be unused going forward

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 60)
        print("[SUCCESS] TOTP migration completed successfully!")
        print("\nChanges:")
        print("  - Added totp_secret column to users table")
        print("  - Phone number columns preserved for backwards compatibility")
        print("\nNew 2FA flow:")
        print("  1. User enables 2FA")
        print("  2. Backend generates TOTP secret and QR code")
        print("  3. User scans QR code with authenticator app")
        print("  4. User verifies with 6-digit code from app")
        print("\nCompatible with:")
        print("  - Google Authenticator")
        print("  - Microsoft Authenticator")
        print("  - Authy")
        print("  - 1Password")
        print("  - Any TOTP-compatible authenticator")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        print("\nYou can restore from the backup if needed:")
        print(f"  cp {BACKUP_DIR}/auth_backup_*.db {DB_PATH}")
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
