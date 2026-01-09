"""SQLite database for user authentication."""

import sqlite3
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime
import threading


DB_PATH = Path("data/auth.db")
_local = threading.local()


def get_connection() -> sqlite3.Connection:
    """Get thread-local database connection."""
    if not hasattr(_local, "conn"):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _local.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
    return _local.conn


def init_db() -> None:
    """Initialize database schema."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL,
            last_login TEXT,
            is_active INTEGER NOT NULL DEFAULT 1
        )
    """)
    
    # Create sessions table (for future use)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Create indices
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")
    
    conn.commit()
    
    # Create default admin if no users exist
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    
    if count == 0:
        from src.auth.user_manager import hash_password
        
        cursor.execute("""
            INSERT INTO users (id, email, name, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "admin_1",
            "admin@amiko.local",
            "Administrator",
            hash_password("admin123"),
            "admin",
            datetime.now().isoformat()
        ))
        conn.commit()
        print("✅ Default admin created: admin@amiko.local / admin123")


def dict_from_row(row: sqlite3.Row) -> Dict:
    """Convert SQLite row to dictionary."""
    return {key: row[key] for key in row.keys()}


# Initialize database on import
init_db()

