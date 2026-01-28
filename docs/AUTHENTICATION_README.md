# 🔐 Complete Authentication System

## Overview

Your RAG system now uses **SQLite** for user authentication - the same database technology already powering ChromaDB!

```
data/
├── auth.db              ← User accounts (SQLite) ✨ NEW
├── chroma/
│   └── chroma.sqlite3   ← Vector embeddings (SQLite) ✨ Already there
├── url_sources.json     ← URL configs
└── doc_metadata.json    ← Document metadata
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend (Python)
pip install bcrypt

# Frontend (Node.js)
cd frontend
npm install jose
npm install  # Install all dependencies
```

### 2. Start Application

```bash
# Terminal 1 - Backend
uvicorn src.app.main:app --reload

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 3. First Login

1. Open http://localhost:3000
2. You'll see the **Login page**
3. Use default admin:
   - **Email:** `admin@amiko.local`
   - **Password:** `admin123`
4. **Important:** Change this password immediately!

---

## 📋 Features

### ✅ **Complete Auth System**
- **SQLite database** (`data/auth.db`)
- **Bcrypt password hashing** (industry standard)
- **JWT tokens** (HTTP-only cookies, 7-day expiration)
- **Protected routes** (auto-redirect to login)
- **Role-based access** (Admin / User)

### ✅ **User Management**
- Create users (admin only)
- Delete users (admin only)
- View all users
- Search users
- Role management
- Last login tracking

### ✅ **Security**
- Passwords never stored in plain text
- HTTP-only cookies (XSS protection)
- Soft delete (users marked inactive, not removed)
- Cannot delete last admin
- Cannot delete yourself

---

## 👥 User Roles

### **Admin**
- ✅ Full access to everything
- ✅ Manage users (create, delete)
- ✅ Manage documents & folders
- ✅ Manage URL sources
- ✅ Upload files
- ✅ Use chat

### **User**
- ✅ Use chat interface
- ✅ View documents
- ✅ View settings
- ❌ Cannot manage users
- ❌ Cannot upload/delete documents
- ❌ Cannot manage URL sources

---

## 🔧 How to Use

### Create New User (Admin)

**Via UI:**
1. Login as admin
2. Go to `/users`
3. Click "Benutzer hinzufügen"
4. Enter name, email, password, role
5. Click "Erstellen"

**Via CLI:**
```bash
python -m src.auth.register_user user@example.com password123 "User Name" user
```

### Login

1. Go to http://localhost:3000
2. Enter email & password
3. Click "Anmelden"
4. Session lasts 7 days

### Logout

Click the **logout icon** (🚪) in the sidebar footer

---

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,              -- user_1234567890_abc
    email TEXT UNIQUE NOT NULL,       -- user@example.com
    name TEXT NOT NULL,               -- Max Mustermann
    password_hash TEXT NOT NULL,      -- $2b$10$...
    role TEXT NOT NULL DEFAULT 'user',-- admin | user
    created_at TEXT NOT NULL,         -- ISO timestamp
    last_login TEXT,                  -- ISO timestamp
    is_active INTEGER NOT NULL DEFAULT 1  -- 1 = active, 0 = deleted
)
```

### Sessions Table (Future)

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

---

## 🔒 Security Best Practices

### Change Default Admin Password

**Option 1: Via UI** (Recommended)
1. Login as admin
2. Go to `/users`
3. Delete old admin
4. Create new admin with strong password

**Option 2: Via Python**
```python
from src.auth.user_manager import hash_password, get_connection

new_password = "YourStrongPassword123!"
password_hash = hash_password(new_password)

conn = get_connection()
cursor = conn.cursor()
cursor.execute(
    "UPDATE users SET password_hash = ? WHERE email = ?",
    (password_hash, "admin@amiko.local")
)
conn.commit()
print("✅ Password updated")
```

### Set JWT Secret (Production)

Add to `.env`:
```bash
JWT_SECRET=your-super-secret-random-key-min-32-chars
```

Generate a strong secret:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Password Requirements

- Minimum 6 characters (configurable)
- Bcrypt work factor: 10 (configurable in `user_manager.py`)
- No password reset (implement email flow if needed)

---

## 🧪 Testing

### Test Login Flow

```bash
# 1. Create test user
python -m src.auth.register_user test@example.com test123 "Test User" user

# 2. Verify credentials
python -m src.auth.verify_user test@example.com test123

# Expected output:
# {"id": "user_...", "email": "test@example.com", "name": "Test User", "role": "user"}

# 3. List all users
python -m src.auth.list_users
```

### Test in Browser

1. Open http://localhost:3000
2. Should redirect to `/login`
3. Login with admin credentials
4. Should redirect to `/` (chat)
5. Check sidebar footer - shows your name/email
6. Click logout icon - should redirect to `/login`

---

## 📊 Architecture

```
┌──────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                    │
│                                                       │
│ /login → /register → Protected Routes                │
│    ↓         ↓              ↓                        │
│ AuthProvider (JWT cookie check)                      │
└──────────────────────────────────────────────────────┘
                      ↓ HTTP
┌──────────────────────────────────────────────────────┐
│ API Routes (Next.js)                                  │
│                                                       │
│ /api/auth/login                                       │
│ /api/auth/register                                    │
│ /api/auth/logout                                      │
│ /api/auth/me                                          │
│ /api/auth/users                                       │
└──────────────────────────────────────────────────────┘
                      ↓ spawn()
┌──────────────────────────────────────────────────────┐
│ Python Scripts                                        │
│                                                       │
│ src/auth/verify_user.py                              │
│ src/auth/register_user.py                            │
│ src/auth/list_users.py                               │
│ src/auth/delete_user.py                              │
└──────────────────────────────────────────────────────┘
                      ↓ SQL
┌──────────────────────────────────────────────────────┐
│ SQLite Database                                       │
│                                                       │
│ data/auth.db                                         │
│ ├── users table                                       │
│ └── sessions table                                    │
└──────────────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### "Invalid credentials" on Login

**Check:**
1. Email is correct (case-insensitive)
2. Password is correct
3. User exists: `python -m src.auth.list_users`
4. User is active (`is_active = 1`)

**Reset admin:**
```bash
# Delete database and restart (creates new default admin)
rm data/auth.db
# Restart backend - database recreates automatically
```

### "User already exists" on Register

**Solution:** Email must be unique. Use different email or delete existing user.

### Cannot Access /users Page

**Check:** You must be logged in as **admin**. Regular users see "Keine Berechtigung".

### JWT Token Errors

**Check:**
1. `jose` package installed: `npm list jose`
2. Cookie is set (check browser DevTools → Application → Cookies)
3. JWT_SECRET is consistent (don't change it after creating tokens)

**Clear all cookies:**
```javascript
// In browser console
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
// Then refresh page
```

### Database Locked

**Check:** Only one backend process should access `data/auth.db`

**Fix:**
```bash
# Kill all Python processes
# Restart backend
uvicorn src.app.main:app --reload
```

---

## 📝 API Reference

### POST /api/auth/register
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "user"  // optional, defaults to "user"
}

Response:
{
  "success": true,
  "user": {
    "id": "user_...",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user"
  }
}
```

### POST /api/auth/login
```json
Request:
{
  "email": "admin@amiko.local",
  "password": "admin123"
}

Response:
{
  "success": true,
  "user": {
    "id": "admin_1",
    "email": "admin@amiko.local",
    "name": "Administrator",
    "role": "admin"
  }
}
+ Sets HTTP-only cookie "auth-token"
```

### POST /api/auth/logout
```json
Response:
{
  "success": true
}
+ Clears "auth-token" cookie
```

### GET /api/auth/me
```json
Response:
{
  "user": {
    "id": "admin_1",
    "email": "admin@amiko.local",
    "role": "admin"
  }
}
```

### GET /api/auth/users (Admin only)
```json
Response:
{
  "users": [
    {
      "id": "admin_1",
      "email": "admin@amiko.local",
      "name": "Administrator",
      "role": "admin",
      "createdAt": "2026-01-09T...",
      "lastLogin": "2026-01-09T..."
    }
  ]
}
```

### DELETE /api/auth/users?id=user_123 (Admin only)
```json
Response:
{
  "success": true
}
```

---

## ✅ Summary

**Database:** SQLite (`data/auth.db`) - same tech as ChromaDB!

**Default Admin:**
- Email: `admin@amiko.local`
- Password: `admin123` (change immediately!)

**Features:**
- ✅ Secure password hashing (bcrypt)
- ✅ JWT session management
- ✅ Role-based access control
- ✅ Protected routes
- ✅ Beautiful login/register UI
- ✅ User management dashboard

**Next Steps:**
1. Login with default admin
2. Create your own admin account
3. Delete/change default admin
4. Create user accounts for your team
5. Start using the RAG system!

🎉 **Production-ready authentication system!**

