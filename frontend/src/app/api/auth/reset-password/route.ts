import { NextRequest, NextResponse } from "next/server";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "..", "data", "auth.db");

async function getDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token und neues Passwort erforderlich" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Passwort muss mindestens 6 Zeichen lang sein" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find token
    const tokenData = await db.get(
      `SELECT
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used,
        u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND u.is_active = 1`,
      [token]
    );

    if (!tokenData) {
      await db.close();
      return NextResponse.json(
        { error: "Ungültiges oder abgelaufenes Token" },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (tokenData.used) {
      await db.close();
      return NextResponse.json(
        { error: "Dieses Token wurde bereits verwendet" },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      await db.close();
      return NextResponse.json(
        { error: "Dieses Token ist abgelaufen" },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.run(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, tokenData.user_id]
    );

    // Mark token as used
    await db.run(
      "UPDATE password_reset_tokens SET used = 1 WHERE id = ?",
      [tokenData.id]
    );

    // Optionally: Delete all other reset tokens for this user
    await db.run(
      "DELETE FROM password_reset_tokens WHERE user_id = ? AND id != ?",
      [tokenData.user_id, tokenData.id]
    );

    await db.close();

    console.log(`Password reset successful for user: ${tokenData.email}`);

    return NextResponse.json({
      message: "Passwort erfolgreich geändert",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
