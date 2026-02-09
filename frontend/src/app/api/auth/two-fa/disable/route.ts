import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { verifyPassword, normalizeEmail } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Disable 2FA for authenticated user
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as string;
    const userEmail = verified.payload.email as string;

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const userResult = await query(
      "SELECT password_hash FROM users WHERE id = $1 AND email = $2 AND is_active = true",
      [userId, normalizeEmail(userEmail)]
    );

    if (!userResult.rowCount) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const passwordOk = await verifyPassword(
      password,
      userResult.rows[0].password_hash
    );

    if (!passwordOk) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    await query(
      "UPDATE users SET two_fa_enabled = false, totp_secret = NULL, two_fa_enrolled_at = NULL WHERE id = $1",
      [userId]
    );

    await query("DELETE FROM two_fa_backup_codes WHERE user_id = $1", [
      userId,
    ]);
    await query("DELETE FROM two_fa_pending_sessions WHERE user_id = $1", [
      userId,
    ]);
    await query("DELETE FROM two_fa_verification_codes WHERE user_id = $1", [
      userId,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
