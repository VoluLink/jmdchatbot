# Authentication System Setup Guide

## 🔐 Overview

Your RAG system now has a **complete authentication system** with:
- **SQLite database** for user storage (`data/auth.db`)
- **Bcrypt password hashing** for security
- **JWT tokens** for session management
- **Role-based access** (Admin / User)
- **Protected routes** - login required

---

## 📊 Database Structure

### SQLite Database: `data/auth.db`

**Users Table:**
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL,
    last_login TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
)
```

**Sessions Table:** (for future use)
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
)
```

---

## 🚀 Getting Started

### Step 1: Install Dependencies

**Backend:**
```bash
pip install bcrypt
```

**Frontend:**
```bash
cd frontend
npm install jose
```

### Step 2: Initialize Database

The database is **automatically created** on first run with a default admin:

```
📧 Email:    admin@amiko.local
🔑 Password: admin123
```

### Step 3: Start the Application

```bash
# Terminal 1 - Backend
uvicorn src.app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 4: First Login

1. Go to http://localhost:3000
2. You'll be redirected to `/login`
3. Login with: `admin@amiko.local` / `admin123`
4. **Change the default password** in user settings!

---

## 👤 User Management

### Create New User (Admin Only)

1. Go to `/users`
2. Click "Benutzer hinzufügen"
3. Enter:
   - **Name**: Full name
   - **Email**: Email address (must be unique)
   - **Password**: At least 6 characters
   - **Role**: Admin or User
4. Click "Erstellen"

### Delete User

1. Go to `/users`
2. Click trash icon next to user
3. Confirm deletion

**Protections:**
- ✅ Cannot delete the last admin
- ✅ Cannot delete yourself
- ✅ Users are soft-deleted (`is_active = 0`)

---

## 🔒 Security Features

### Password Hashing
- **Bcrypt** with automatic salt generation
- Passwords **never** stored in plain text
- Configurable work factor (default: 10)

### JWT Tokens
- **HTTP-only cookies** (not accessible via JavaScript)
- **7-day expiration**
- **Signed** with secret key
- **Secure flag** in production

### Session Management
- Auto-redirect to login if not authenticated
- Token verification on every protected route
- Logout clears cookie and redirects

### Protected Routes
All routes require login except:
- `/login` - Login page
- `/register` - Registration page

---

## 🎯 User Roles

### **Admin**
- ✅ Manage users (create, delete)
- ✅ Manage documents & folders
- ✅ Manage URL sources
- ✅ Access all features

### **User**
- ✅ Use chat interface
- ✅ View documents
- ✅ View settings
- ❌ Cannot manage users
- ❌ Cannot delete/move documents
- ❌ Cannot manage URL sources

---

## 🔧 Configuration

### JWT Secret (Production)

Add to `.env`:
```bash
JWT_SECRET=your-super-secret-key-change-this-in-production
```

**Important:** Use a strong random key in production!

### Change Default Admin Password

```python
# Run Python script
python -c "
from src.auth.user_manager import hash_password, get_connection

new_password = 'YourNewStrongPassword123!'
password_hash = hash_password(new_password)

conn = get_connection()
cursor = conn.cursor()
cursor.execute('UPDATE users SET password_hash = ? WHERE email = ?', 
               (password_hash, 'admin@amiko.local'))
conn.commit()
print('✅ Password updated')
"
```

---

## 🧪 Testing

### Create Test User via CLI

```bash
python -m src.auth.register_user test@example.com password123 "Test User" user
```

### Verify Login

```bash
python -m src.auth.verify_user test@example.com password123
```

**Expected output:**
```json
{
  "id": "user_1234567890_abc",
  "email": "test@example.com",
  "name": "Test User",
  "role": "user"
}
```

### List All Users

```bash
python -m src.auth.list_users
```

---

## 📋 API Endpoints

### Authentication

```http
# Login
POST /api/auth/login
{
  "email": "admin@amiko.local",
  "password": "admin123"
}
Response: Sets HTTP-only cookie "auth-token"

# Register
POST /api/auth/register
{
  "email": "new@example.com",
  "password": "password123",
  "name": "New User"
}

# Logout
POST /api/auth/logout
Response: Clears auth-token cookie

# Get Current User
GET /api/auth/me
Response: { "user": { "id", "email", "name", "role" } }
```

### User Management (Admin only)

```http
# List Users
GET /api/auth/users

# Delete User
DELETE /api/auth/users?id=user_123
```

---

## 🔍 Troubleshooting

### "Invalid credentials" Error

**Check:**
1. Email is correct (case-insensitive)
2. Password is correct
3. User exists in database
4. User is active (`is_active = 1`)

**Reset admin password:**
```bash
# See "Change Default Admin Password" section above
```

### "Cannot delete last admin"

**Solution:** Create another admin first:
1. Go to `/users`
2. Create new user with admin role
3. Then delete the old admin

### Database Locked

**Check:** No other process is using `data/auth.db`

**Fix:**
```bash
# Close any Python processes
# Restart the backend
```

### JWT Token Issues

**Check:**
1. JWT_SECRET is set in `.env`
2. Cookie is HTTP-only
3. Same-site policy is correct

**Clear cookies:**
```javascript
// In browser console
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                       │
│ ┌─────────────┐  ┌──────────────┐  ┌─────────────┐    │
│ │ Login Page  │  │ Auth Context │  │  Protected  │    │
│ │             │→ │              │→ │   Routes    │    │
│ └─────────────┘  └──────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│ API Routes (Next.js API)                                 │
│ /api/auth/login → /api/auth/register → /api/auth/me    │
└─────────────────────────────────────────────────────────┘
                         ↓ spawn()
┌─────────────────────────────────────────────────────────┐
│ Python Backend                                           │
│ src/auth/verify_user.py → src/auth/user_manager.py     │
└─────────────────────────────────────────────────────────┘
                         ↓ SQL
┌─────────────────────────────────────────────────────────┐
│ SQLite Database                                          │
│ data/auth.db                                            │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Summary

- **Database:** SQLite (`data/auth.db`)
- **Password:** Bcrypt hashed
- **Sessions:** JWT tokens (HTTP-only cookies)
- **Default Admin:** admin@amiko.local / admin123
- **Protected:** All routes except /login and /register
- **Roles:** Admin (full access) / User (limited)

**Next Steps:**
1. Login with default admin
2. Change admin password
3. Create your users
4. Start using the RAG system!

🎉 **Complete production-ready authentication!**

