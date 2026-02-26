# Authentication System

## Overview

All auth logic lives in the Next.js frontend API routes. The FastAPI backend has no authentication — it is internal only.

- **Passwords**: bcrypt hashing
- **Sessions**: JWT (HS256, 7-day expiry) in HTTP-only cookies
- **2FA**: TOTP (Google Authenticator/Authy), SMS (Twilio), backup codes
- **Roles**: Admin (full access) and User (chat + view only)

## Database

**Production**: PostgreSQL (via `DATABASE_URL` env var)
**Development**: SQLite at `data/auth.db` (auto-created on first run)

### Users Table

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',  -- admin | user
    created_at TEXT NOT NULL,
    last_login TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
)
```

## Default Admin

```
Email:    admin@amiko.local
Password: admin123
```

Change this immediately after first login.

## User Roles

**Admin**: manage users, upload/delete documents, manage URL sources, use chat

**User**: use chat, view documents, view settings

## Auth API Routes

| Route | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/auth/me` | GET | Current user info |
| `/api/auth/change-password` | POST | Change own password |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Complete password reset |
| `/api/auth/users` | GET | List all users (admin only) |
| `/api/auth/admin/reset-password` | POST | Admin password reset |
| `/api/auth/two-fa/*` | POST | 2FA setup, verify, disable |

## 2FA

Supports three methods:
- **TOTP**: Time-based codes via Google Authenticator or Authy
- **SMS**: Codes sent via Twilio (set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`, or use `TWILIO_MOCK_MODE=true` for development)
- **Backup codes**: Generated at 2FA setup, one-time use for recovery

## Configuration

```bash
# Required for production
JWT_SECRET=your-secret-key-min-32-chars
DATABASE_URL=postgresql://user:pass@host:5432/db

# Optional: Twilio for SMS 2FA
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
TWILIO_MOCK_MODE=true  # logs codes to console instead of sending SMS
```

## Troubleshooting

**"Invalid credentials"** - Check email/password, verify user exists with `python -m src.auth.list_users`, check `is_active = 1`

**"Cannot delete last admin"** - Create another admin first, then delete the old one

**JWT token issues** - Ensure `JWT_SECRET` is set in `.env` and hasn't changed since tokens were issued. Clear browser cookies if needed.

**Reset admin** - Delete `data/auth.db` and restart the backend. A new default admin will be created automatically.
