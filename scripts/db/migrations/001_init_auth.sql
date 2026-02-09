CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL,
  last_login TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_fa_enrolled_at TIMESTAMPTZ,
  totp_secret TEXT,
  phone_number TEXT,
  country_code TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS two_fa_backup_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS two_fa_pending_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS two_fa_verification_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
  ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_two_fa_backup_codes_user_id
  ON two_fa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_two_fa_pending_sessions_token
  ON two_fa_pending_sessions(token);
CREATE INDEX IF NOT EXISTS idx_two_fa_pending_sessions_user_id
  ON two_fa_pending_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_two_fa_verification_codes_user_id
  ON two_fa_verification_codes(user_id);
