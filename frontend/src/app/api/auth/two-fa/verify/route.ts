import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { normalizeEmail, normalizeBackupCode } from "@/lib/auth";
import { verifyTotp } from "@/lib/twofa";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

async function issueJwt(user: { id: string; email: string; name: string; role: string; must_change_password?: boolean }) {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    mustChangePassword: !!user.must_change_password,
  });

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}

async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const normalized = normalizeBackupCode(code);
  const result = await query(
    "SELECT id, code_hash FROM two_fa_backup_codes WHERE user_id = $1 AND used = false",
    [userId]
  );

  for (const row of result.rows) {
    const ok = await bcrypt.compare(normalized, row.code_hash);
    if (ok) {
      await query("UPDATE two_fa_backup_codes SET used = true WHERE id = $1", [
        row.id,
      ]);
      return true;
    }
  }

  return false;
}

// POST - Verify 2FA TOTP code or backup code during login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, code, purpose, userId } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    if (sessionToken) {
      const sessionResult = await query(
        `SELECT id, user_id, expires_at
         FROM two_fa_pending_sessions
         WHERE token = $1 AND purpose = 'login'
         LIMIT 1`,
        [sessionToken]
      );

      if (!sessionResult.rowCount) {
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }

      const session = sessionResult.rows[0];
      if (new Date() > new Date(session.expires_at)) {
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }

      const userResult = await query(
        "SELECT id, email, name, role, totp_secret, must_change_password FROM users WHERE id = $1 AND is_active = true",
        [session.user_id]
      );

      if (!userResult.rowCount) {
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];
      const tokenIsTotp = String(code).length === 6;
      const totpOk = tokenIsTotp && user.totp_secret
        ? verifyTotp(code, user.totp_secret)
        : false;
      const backupOk = !tokenIsTotp ? await verifyBackupCode(user.id, code) : false;

      if (!totpOk && !backupOk) {
        return NextResponse.json(
          { error: "Invalid code" },
          { status: 401 }
        );
      }

      await query("DELETE FROM two_fa_pending_sessions WHERE id = $1", [
        session.id,
      ]);
      await query("UPDATE users SET last_login = $1 WHERE id = $2", [
        new Date().toISOString(),
        user.id,
      ]);

      return issueJwt(user);
    }

    if (purpose === "backup" && userId) {
      const email = normalizeEmail(userId);
      const userResult = await query(
        "SELECT id, email, name, role, must_change_password FROM users WHERE email = $1 AND is_active = true",
        [email]
      );

      if (!userResult.rowCount) {
        return NextResponse.json(
          { error: "Invalid code" },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];
      const backupOk = await verifyBackupCode(user.id, code);

      if (!backupOk) {
        return NextResponse.json(
          { error: "Invalid code" },
          { status: 401 }
        );
      }

      await query("UPDATE users SET last_login = $1 WHERE id = $2", [
        new Date().toISOString(),
        user.id,
      ]);

      return issueJwt(user);
    }

    return NextResponse.json(
      { error: "Session token and code are required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error verifying 2FA code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
