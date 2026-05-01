import { Pool, type QueryResult, type QueryResultRow } from 'pg';

// Check if we're using PostgreSQL or SQLite
const USE_POSTGRES = !!process.env.DATABASE_URL;

// ============================================================================
// PostgreSQL Implementation
// ============================================================================

const globalForPg = globalThis as typeof globalThis & {
  __pgPool?: Pool;
  __pgInitialized?: boolean;
};

function getPool(): Pool {
  if (globalForPg.__pgPool) {
    return globalForPg.__pgPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({
    connectionString,
    max: 10,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPg.__pgPool = pool;
  }

  return pool;
}

async function initializePostgres(pool: Pool): Promise<void> {
  if (globalForPg.__pgInitialized) {
    return;
  }

  await initializePostgresSchema(pool);

  const result = await pool.query('SELECT id FROM users LIMIT 1');
  if (result.rowCount === 0) {
    await seedPostgresAdmin(pool);
  }

  globalForPg.__pgInitialized = true;
}

async function initializePostgresSchema(pool: Pool): Promise<void> {
  await pool.query(`
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
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      two_fa_required BOOLEAN NOT NULL DEFAULT FALSE
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

    ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_required BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

async function seedPostgresAdmin(pool: Pool): Promise<void> {
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('admin123', 10);
  const userId = `user_${Date.now()}_default`;
  const createdAt = new Date().toISOString();

  try {
    await pool.query(
      `INSERT INTO users (id, email, name, password_hash, role, created_at, is_active, two_fa_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, true, false)`,
      [userId, 'admin@amiko.local', 'Admin', passwordHash, 'admin', createdAt],
    );
    console.log('Created default admin user: admin@amiko.local / admin123');
  } catch (error: any) {
    // Ignore if user already exists (race condition)
    if (error.code !== '23505') {
      // 23505 = unique_violation
      console.error('Error seeding admin user:', error);
    }
  }
}

// ============================================================================
// SQLite Implementation (for local development)
// ============================================================================

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const globalForSqlite = globalThis as typeof globalThis & {
  __sqliteDb?: Database;
  __sqliteInitialized?: boolean;
};

const SQLITE_DB_PATH = path.join(process.cwd(), 'data', 'local.db');

async function getSqliteDb(): Promise<Database> {
  if (globalForSqlite.__sqliteDb) {
    return globalForSqlite.__sqliteDb;
  }

  // Ensure data directory exists
  const fs = await import('fs/promises');
  const dataDir = path.dirname(SQLITE_DB_PATH);
  await fs.mkdir(dataDir, { recursive: true });

  const db = await open({
    filename: SQLITE_DB_PATH,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');

  // Initialize schema if needed
  if (!globalForSqlite.__sqliteInitialized) {
    await initializeSqliteSchema(db);
    globalForSqlite.__sqliteInitialized = true;
  }

  if (process.env.NODE_ENV !== 'production') {
    globalForSqlite.__sqliteDb = db;
  }

  return db;
}

async function initializeSqliteSchema(db: Database) {
  // SQLite-compatible schema (TEXT instead of TIMESTAMPTZ)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      last_login TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      two_fa_enabled INTEGER NOT NULL DEFAULT 0,
      two_fa_enrolled_at TEXT,
      totp_secret TEXT,
      phone_number TEXT,
      country_code TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      two_fa_required INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS two_fa_backup_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS two_fa_pending_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      purpose TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS two_fa_verification_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
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
  `);

  // Seed default admin user for local development
  await seedDefaultAdmin(db);

  console.log('SQLite database initialized at:', SQLITE_DB_PATH);
}

async function seedDefaultAdmin(db: Database) {
  // Check if any users exist
  const existing = await db.get('SELECT id FROM users LIMIT 1');
  if (existing) {
    return; // Users already exist, don't seed
  }

  // Create default admin user: admin@amiko.local / admin123
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('admin123', 10);
  const userId = `user_${Date.now()}_default`;
  const createdAt = new Date().toISOString();

  await db.run(
    `INSERT INTO users (id, email, name, password_hash, role, created_at, is_active, two_fa_enabled)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
    [userId, 'admin@amiko.local', 'Admin', passwordHash, 'admin', createdAt],
  );

  console.log('Created default admin user: admin@amiko.local / admin123');
}

// Convert PostgreSQL $1, $2 placeholders to SQLite ? placeholders
function convertParams(text: string): string {
  return text.replace(/\$(\d+)/g, '?');
}

// Convert SQLite result to pg-compatible format
function toQueryResult<T extends QueryResultRow>(
  rows: T[],
  changes?: number,
): QueryResult<T> {
  return {
    rows,
    rowCount: changes ?? rows.length,
    command: '',
    oid: 0,
    fields: [],
  } as QueryResult<T>;
}

// ============================================================================
// Unified Query Interface
// ============================================================================

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  if (USE_POSTGRES) {
    const pool = getPool();
    // Initialize and seed on first query
    await initializePostgres(pool);
    return pool.query(text, params);
  }

  // SQLite path
  const db = await getSqliteDb();
  const sqliteQuery = convertParams(text);
  const trimmedQuery = sqliteQuery.trim().toUpperCase();

  // Determine if this is a SELECT query
  if (trimmedQuery.startsWith('SELECT')) {
    const rows = (await db.all(sqliteQuery, params)) as T[];
    // Convert SQLite INTEGER booleans to JavaScript booleans
    const convertedRows = rows.map((row: T) => {
      const converted = { ...row } as Record<string, any>;
      for (const key of Object.keys(converted)) {
        if (
          key === 'is_active' ||
          key === 'two_fa_enabled' ||
          key === 'used' ||
          key === 'must_change_password' ||
          key === 'two_fa_required'
        ) {
          converted[key] = Boolean(converted[key]);
        }
      }
      return converted as T;
    });
    return toQueryResult(convertedRows);
  }

  // INSERT, UPDATE, DELETE
  const result = await db.run(sqliteQuery, params);
  return toQueryResult<T>([], result.changes);
}

export { getPool };
