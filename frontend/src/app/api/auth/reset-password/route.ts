import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

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

    const tokenResult = await query(
      `SELECT
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used,
        u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND u.is_active = true`,
      [token]
    );

    if (!tokenResult.rowCount) {
      return NextResponse.json(
        { error: "Ungueltiges oder abgelaufenes Token" },
        { status: 400 }
      );
    }

    const tokenData = tokenResult.rows[0];

    if (tokenData.used) {
      return NextResponse.json(
        { error: "Dieses Token wurde bereits verwendet" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Dieses Token ist abgelaufen" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [passwordHash, tokenData.user_id]
    );

    await query(
      "UPDATE password_reset_tokens SET used = true WHERE id = $1",
      [tokenData.id]
    );

    await query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1 AND id != $2",
      [tokenData.user_id, tokenData.id]
    );

    console.log(`Password reset successful for user: ${tokenData.email}`);

    return NextResponse.json({
      message: "Passwort erfolgreich geaendert",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
