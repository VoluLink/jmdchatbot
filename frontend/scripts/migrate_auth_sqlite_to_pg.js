const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { Client } = require("pg");

async function tableExists(db, name) {
  const row = await db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [name]
  );
  return !!row;
}

async function main() {
  const sqlitePath = path.join(__dirname, "..", "..", "data", "auth.db");
  const sqlite = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });

  if (!(await tableExists(sqlite, "users"))) {
    console.log("No users table found in SQLite. Nothing to migrate.");
    await sqlite.close();
    return;
  }

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const users = await sqlite.all("SELECT * FROM users");
  for (const user of users) {
    await pg.query(
      `INSERT INTO users
        (id, email, name, password_hash, role, created_at, last_login, is_active, two_fa_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
       ON CONFLICT (id) DO NOTHING`,
      [
        user.id,
        (user.email || "").toLowerCase(),
        user.name,
        user.password_hash,
        user.role || "user",
        user.created_at,
        user.last_login,
        !!user.is_active,
      ]
    );
  }

  if (await tableExists(sqlite, "password_reset_tokens")) {
    const tokens = await sqlite.all("SELECT * FROM password_reset_tokens");
    for (const token of tokens) {
      await pg.query(
        `INSERT INTO password_reset_tokens
          (id, user_id, token, created_at, expires_at, used)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [
          token.id,
          token.user_id,
          token.token,
          token.created_at,
          token.expires_at,
          !!token.used,
        ]
      );
    }
  }

  await pg.end();
  await sqlite.close();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
