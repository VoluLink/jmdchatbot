import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { generateBackupCodes } from "@/lib/auth";
import { verifyTotp } from "@/lib/twofa";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Enable 2FA after verifying TOTP code
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

    const body = await request.json();
    const { verificationCode } = body;

    if (!verificationCode || verificationCode.length !== 6) {
      return NextResponse.json(
        { error: "Valid 6-digit verification code required" },
        { status: 400 }
      );
    }

    const userResult = await query(
      "SELECT totp_secret FROM users WHERE id = $1 AND is_active = true",
      [userId]
    );

    if (!userResult.rowCount || !userResult.rows[0].totp_secret) {
      return NextResponse.json(
        { error: "2FA setup not initialized" },
        { status: 400 }
      );
    }

    const secret = userResult.rows[0].totp_secret as string;
    const isValid = verifyTotp(verificationCode, secret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    await query(
      "UPDATE users SET two_fa_enabled = true, two_fa_enrolled_at = $1 WHERE id = $2",
      [new Date().toISOString(), userId]
    );

    await query("DELETE FROM two_fa_backup_codes WHERE user_id = $1", [
      userId,
    ]);

    const { plainCodes, hashedCodes } = await generateBackupCodes(8);

    for (let i = 0; i < hashedCodes.length; i += 1) {
      await query(
        `INSERT INTO two_fa_backup_codes
          (id, user_id, code_hash, used, created_at)
         VALUES ($1, $2, $3, false, $4)`,
        [
          `backup_${userId}_${i}_${Date.now()}`,
          userId,
          hashedCodes[i],
          new Date().toISOString(),
        ]
      );
    }

    return NextResponse.json({
      success: true,
      backupCodes: plainCodes,
    });
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    return NextResponse.json(
      { error: "Failed to enable 2FA" },
      { status: 500 }
    );
  }
}
