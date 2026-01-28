import { NextRequest, NextResponse } from "next/server";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const DB_PATH = path.join(process.cwd(), "..", "data", "auth.db");

async function getDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token erforderlich" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find token and associated user
    const tokenData = await db.get(
      `SELECT
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used,
        u.email,
        u.name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND u.is_active = 1`,
      [token]
    );

    await db.close();

    if (!tokenData) {
      return NextResponse.json(
        { error: "Ungültiges oder abgelaufenes Token" },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (tokenData.used) {
      return NextResponse.json(
        { error: "Dieses Token wurde bereits verwendet" },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Dieses Token ist abgelaufen" },
        { status: 400 }
      );
    }

    // Token is valid
    return NextResponse.json({
      email: tokenData.email,
      valid: true,
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
