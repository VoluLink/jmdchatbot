#!/usr/bin/env python3
"""Add 2FA support to database."""

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


def table_exists(cursor: sqlite3.Cursor, table: str) -> bool:
    """Check if a table exists."""
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name=?
    """, (table,))
    return cursor.fetchone() is not None


def migrate():
    """Run the migration."""
    print("Starting 2FA migration...")
    print("=" * 60)

    # Create backup first
    create_backup()
    print()

    # Connect to database
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    try:
        # 1. Add columns to users table
        print("1. Updating users table...")

        columns_to_add = [
            ("phone_number", "TEXT"),
            ("phone_country_code", "TEXT DEFAULT '+49'"),
            ("two_fa_enabled", "INTEGER NOT NULL DEFAULT 0"),
            ("two_fa_enrolled_at", "TEXT"),
        ]

        for col_name, col_type in columns_to_add:
            if not column_exists(cursor, "users", col_name):
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"  [OK] Added column: {col_name}")
            else:
                print(f"  > Column already exists: {col_name}")

        # 2. Create two_fa_codes table
        print("\n2. Creating two_fa_codes table...")
        if not table_exists(cursor, "two_fa_codes"):
            cursor.execute("""
                CREATE TABLE two_fa_codes (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    code_hash TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    max_attempts INTEGER NOT NULL DEFAULT 3,
                    verified INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            print("  [OK] Created two_fa_codes table")
        else:
            print("  > Table already exists: two_fa_codes")

        # 3. Create backup_codes table
        print("\n3. Creating backup_codes table...")
        if not table_exists(cursor, "backup_codes"):
            cursor.execute("""
                CREATE TABLE backup_codes (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    code_hash TEXT NOT NULL,
                    used INTEGER NOT NULL DEFAULT 0,
                    used_at TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            print("  [OK] Created backup_codes table")
        else:
            print("  > Table already exists: backup_codes")

        # 4. Create two_fa_sessions table
        print("\n4. Creating two_fa_sessions table...")
        if not table_exists(cursor, "two_fa_sessions"):
            cursor.execute("""
                CREATE TABLE two_fa_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            print("  [OK] Created two_fa_sessions table")
        else:
            print("  > Table already exists: two_fa_sessions")

        # 5. Create indices
        print("\n5. Creating indices...")

        indices = [
            ("idx_two_fa_codes_user_id", "two_fa_codes", "user_id"),
            ("idx_two_fa_codes_expires_at", "two_fa_codes", "expires_at"),
            ("idx_backup_codes_user_id", "backup_codes", "user_id"),
            ("idx_two_fa_sessions_token", "two_fa_sessions", "session_token"),
            ("idx_two_fa_sessions_user_id", "two_fa_sessions", "user_id"),
        ]

        for idx_name, table_name, column_name in indices:
            cursor.execute(f"""
                CREATE INDEX IF NOT EXISTS {idx_name}
                ON {table_name}({column_name})
            """)
            print(f"  [OK] Created index: {idx_name}")

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 60)
        print("[SUCCESS] Migration completed successfully!")
        print("\nNew tables created:")
        print("  - two_fa_codes (temporary verification codes)")
        print("  - backup_codes (recovery codes)")
        print("  - two_fa_sessions (pending 2FA login sessions)")
        print("\nNew columns added to users table:")
        print("  - phone_number")
        print("  - phone_country_code")
        print("  - two_fa_enabled")
        print("  - two_fa_enrolled_at")

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
